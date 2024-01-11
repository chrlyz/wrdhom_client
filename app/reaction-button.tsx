import { useState } from "react";
import EmojiPicker from "./emoji-picker";

export default function ReactionButton({
  targetKey
}: {
  targetKey: string
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
  
    return (
      <div>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="hover:text-lg mr-2"
        >
          👽
        </button>
        {showPicker && <EmojiPicker createReaction={createReaction} />}
      </div>
    );
}