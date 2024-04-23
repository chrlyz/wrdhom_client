import { useState } from "react";
import EmojiPicker from "./emoji-picker";
import { EmbeddedReactions } from "./get-global-posts";

export default function ReactionButton({
  targetKey,
  embeddedReactions
}: {
  targetKey: string,
  embeddedReactions: EmbeddedReactions[]
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

      console.log(await res.text());
      setShowPicker(false);
    };

    const deleteReaction = async (reactionState: any | null) => {
      const {ReactionState, fieldToFlagReactionsAsDeleted} = await import('wrdhom');
      const initialReactionStateHash = ReactionState.fromJSON(reactionState).hash();

      const signedData = await (window as any).mina.signFields({ message: [
        initialReactionStateHash.toString(),
        fieldToFlagReactionsAsDeleted.toString()
      ]});

      const signedReactionDeletion = {
        reactionState: JSON.stringify(reactionState),
        signedData: signedData
      }

      const res = await fetch('/reactions/delete', {
        method: `POST`,
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
        />}
      </div>
    );
}