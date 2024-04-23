import { EmbeddedReactions } from "./get-global-posts";

export default function EmojiPicker({
    createReaction,
    deleteReaction,
    embeddedReactions
}: {
    createReaction: (emoji: string) => void,
    deleteReaction: (reactionState: any) => void,
    embeddedReactions: EmbeddedReactions[]
}) {
    const emojis = ['👍', '👎', '😂', '🤔', '😢', '😠', '😎', '🔥', '👀',
    '🩶', '💔', '🙏', '🤝', '🤌', '🙌', '🤭', '😳', '😭', '🤯', '😡',
    '👽', '😈', '💀', '💯'];
    return (
        <div>
        {emojis.map((emoji) => {
            const isCurrentUserReaction = embeddedReactions.some(reaction => reaction.reactionEmoji === emoji) ? true : false;
            const highlight = isCurrentUserReaction ? 'bg-black' : '';
            let reactionState: any = null;
            embeddedReactions.forEach( reaction => {
                if(reaction.reactionEmoji === emoji) {
                    reactionState = reaction.reactionState;
                }
            });
            return (
                <button
                key={emoji}
                className={`m-1 ${highlight}`}
                onClick={() => {
                    if (!isCurrentUserReaction) {
                        createReaction(emoji);
                    } else {
                        deleteReaction(reactionState);
                    }
                }}
                >
                {emoji}
                </button>
            );
        })}
        </div>
    );
}