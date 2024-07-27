import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRetweet } from '@fortawesome/free-solid-svg-icons';
import { RepostState } from 'wrdhom';

export default function DeleteRepostButton({
    repostTargetKey,
    repostState,
    repostKey
}: {
    repostTargetKey: string,
    repostState: any,
    repostKey: string
}) {

    const handleClick = async () => {
        const { RepostState, fieldToFlagRepostsAsDeleted } = await import('wrdhom');
        console.log(repostState.posterAddress)
        const repostStateTyped = RepostState.fromJSON(repostState) as RepostState;
        const repostStateHash = repostStateTyped.hash();

        const signed = await (window as any).mina
            .signFields({ message: [repostStateHash.toString(), fieldToFlagRepostsAsDeleted.toString()] });

        const signedRepostDeletion = {
            targetKey: repostTargetKey,
            repostKey: repostKey,
            signedData: signed
        }

        const res = await fetch('/reposts/delete', {
            method: `PATCH`,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signedRepostDeletion),
        });

        console.log(await res.text());
    }

    return <button className="hover:text-lg ml-3 mr-3 mb-1" onClick={handleClick}>
            <FontAwesomeIcon icon={faRetweet} color='#16a34a'  />
    </button>
}