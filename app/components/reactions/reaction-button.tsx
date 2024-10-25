import { useState } from "react";
import EmojiPicker from "./emoji-picker";
import { EmbeddedReactions } from "../types";
import { ReactionState } from "wrdhom";

export default function ReactionButton({
  targetKey,
  embeddedReactions,
  account
}: {
  targetKey: string,
  embeddedReactions: EmbeddedReactions[],
  account: string
}) {
    const [showPicker, setShowPicker] = useState(false);
  
    const createReaction = async (emoji: string) => {
      const signedData = await (window as any).mina.signFields({ message: [
        targetKey,
        emoji.codePointAt(0)?.toString()
      ]});

      const res = await fetch('/reactions', {
        method: `POST`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedData),
      });

      const resJSON = await res.json();

      if (await resJSON.message === 'Restore?') {
        const restore = confirm('Reaction already exists but was deleted. Do you want to restore it?');
        if (restore) {
            const { ReactionState, fieldToFlagReactionsAsRestored } = await import('wrdhom');
            const reactionKey = resJSON.reactionKey;
            const response = await fetch(`/reactions`+
            `?reactionKey=${reactionKey.toString()}`,
            {
              headers: {'Cache-Control': 'no-cache'}
            }
          );
          const data: any = await response.json();
          const reactionStateJSON = JSON.parse(data.reactionState);
          const reactionState = ReactionState.fromJSON(reactionStateJSON) as ReactionState;
          const s = await (window as any).mina
                        .signFields({ message: [
                            reactionState.hash().toString(),
                            fieldToFlagReactionsAsRestored.toString()
                        ] });
          const signedReactionRestoration = {
            targetKey: targetKey,
            reactionKey: reactionKey.toString(),
            signedData: s
          }

          const restorationRes = await fetch('/reactions/restore', {
            method: `PATCH`,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signedReactionRestoration),
          });

          console.log(await restorationRes.text());
        }
    }

      setShowPicker(false);
    };

    const deleteReaction = async (reactionState: any | null) => {
      const {ReactionState, fieldToFlagReactionsAsDeleted} = await import('wrdhom');
      const reactionStateTyped = ReactionState.fromJSON(reactionState) as ReactionState;
      const initialReactionStateHash = reactionStateTyped.hash();

      const signedData = await (window as any).mina.signFields({ message: [
        initialReactionStateHash.toString(),
        fieldToFlagReactionsAsDeleted.toString()
      ]});

      const signedReactionDeletion = {
        reactionState: JSON.stringify(reactionState),
        signedData: signedData
      }

      const res = await fetch('/reactions/delete', {
        method: `PATCH`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedReactionDeletion),
      });

      console.log(await res.text());

      setShowPicker(false);
    };
  
    return (
      <div>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="hover:text-lg mr-2"
        >
          👽
        </button>
        {showPicker && <EmojiPicker
          createReaction={createReaction}
          deleteReaction={deleteReaction}
          embeddedReactions={embeddedReactions}
          account={account}
        />}
      </div>
    );
}