import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { CommentState } from 'wrdhom';

export default function DeleteCommentButton({
    commentTarget,
    commentState,
    commentKey
}: {
    commentTarget: any,
    commentState: any,
    commentKey: string
}) {

    const handleClick = async () => {
        const { CommentState, fieldToFlagCommentsAsDeleted } = await import('wrdhom');
        const commentStateTyped = CommentState.fromJSON(commentState) as CommentState;
        const commentStateHash = commentStateTyped.hash();

        const signed = await (window as any).mina
            .signFields({ message: [commentStateHash.toString(), fieldToFlagCommentsAsDeleted.toString()] });

        const signedCommentDeletion = {
            targetKey: commentTarget.postKey,
            commentKey: commentKey,
            signedData: signed
        }

        const res = await fetch('/comments/delete', {
            method: `PATCH`,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signedCommentDeletion),
        });

        console.log(await res.text());
    }

    return <button className="hover:text-lg mb-2" onClick={handleClick}>
            <FontAwesomeIcon icon={faTrash}  />
    </button>
}