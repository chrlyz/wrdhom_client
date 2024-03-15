import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

export default function DeleteButton({
    postState,
    postKey
}: {
    postState: JSON,
    postKey: string
}) {

    const handleClick = async () => {
        const { PostState, fieldToFlagPostsAsDeleted } = await import('wrdhom');
        const postStateHash = PostState.fromJSON(postState).hash();

        const s = await (window as any).mina
            .signFields({ message: [postStateHash.toString(), fieldToFlagPostsAsDeleted.toString()] });

        const signedPostDeletion = {
            postKey: postKey,
            signedData: s
        }

        const res = await fetch('/posts/delete', {
            method: `POST`,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signedPostDeletion),
        });

        console.log(await res.text());
    }

    return <button className="hover:text-lg mb-2" onClick={handleClick}>
            <FontAwesomeIcon icon={faTrash}  />
    </button>
}