export default function EmojiPicker({
    createReaction
}: {
    createReaction: (emoji: string) => void;
}) {
    const emojis = ['❤️', '💔', '😂', '🤔', '😢', '😠', '😎', '🔥', '👀', '👍', '👎', '🙏', '🤝', '🤌', '🙌', '🤭', '😳', '😭', '🤯', '😡', '👽', '😈', '💀', '💯'];
    return (
        <div>
        {emojis.map((emoji) => (
            <button
            key={emoji}
            className="text-2xl m-1"
            onClick={() => createReaction(emoji)}
            >
            {emoji}
            </button>
        ))}
        </div>
    );
}