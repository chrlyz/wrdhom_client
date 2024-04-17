import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

export default function DeleteRepostButton({
    repostTarget,
    repostState,
    repostKey
}: {
    repostTarget: any,
    repostState: JSON,
    repostKey: string
}) {

    const handleClick = async () => {
        const { RepostState, fieldToFlagRepostsAsDeleted } = await import('wrdhom');
        const repostStateHash = RepostState.fromJSON(repostState).hash();

        const signed = await (window as any).mina
            .signFields({ message: [repostStateHash.toString(), fieldToFlagRepostsAsDeleted.toString()] });

        const signedRepostDeletion = {
            targetKey: repostTarget.postKey,
            repostKey: repostKey,
            signedData: signed
        }

        const res = await fetch('/reposts/delete', {
            method: `POST`,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signedRepostDeletion),
        });

        console.log(await res.text());
    }

    return <button className="hover:text-lg mb-1" onClick={handleClick}>
            <FontAwesomeIcon icon={faTrash}  />
    </button>
}