import { useState } from "react";
import EmojiPicker from "./emoji-picker";

export default function ReactionButton({
  posterAddress,
  postContentID
}: {
  posterAddress: string,
  postContentID: string
}) {
    const [showPicker, setShowPicker] = useState(false);
  
    const createReaction = async (emoji: string) => {
      const { Poseidon, PublicKey, CircuitString} = await import('o1js');
      const posterAddressAsField = Poseidon.hash(PublicKey.fromBase58(posterAddress).toFields());
      const postContentIDAsField = CircuitString.fromString(postContentID).hash();
      const targetKey = Poseidon.hash([posterAddressAsField, postContentIDAsField]);
      const s = await (window as any).mina.signFields({ message: [
        targetKey.toString(),
        emoji.codePointAt(0)?.toString()
      ]});

      const signedReaction = {
        posterAddress: posterAddress,
        postContentID: postContentID,
        signedData: s
      }

      const res = await fetch('/reactions', {
        method: `POST`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedReaction),
      });

      console.log(await res.text());

      setShowPicker(false);
    };
  
    return (
      <div className="flex flex-row">
        <div className="flex-grow"></div>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-lg mx-10"
        >
          👽
        </button>
        {showPicker && <EmojiPicker createReaction={createReaction} />}
      </div>
    );
}