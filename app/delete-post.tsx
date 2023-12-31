import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

export default function DeletePost({
    postStateHash,
    postContentID
}: {
    postStateHash: string,
    postContentID: string
}) {

    const handleClick = async () => {
        const s = await (window as any).mina
            .signFields({ message: [postStateHash, '93137'] });
        
        const signedPostDeletion = {
            postContentID: postContentID,
            signedData: s
        }

        const res = await fetch('/posts/delete', {
            method: `POST`,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signedPostDeletion),
        });

        console.log(await res.text());
    }

    return <button className="mb-2" onClick={handleClick}>
            <FontAwesomeIcon icon={faTrash}  />
    </button>
}