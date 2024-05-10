import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRetweet } from '@fortawesome/free-solid-svg-icons';
import { RepostState } from 'wrdhom';

export default function RepostButton({
    targetKey
}: {
    targetKey: string
}) {
  
    const createRepost = async () => {
      const { fieldToFlagTargetAsReposted } = await import('wrdhom');
      const signedData = await (window as any).mina.signFields({ message: [
        targetKey,
        fieldToFlagTargetAsReposted.toString()
      ]});

      const res = await fetch('/reposts', {
        method: `POST`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedData),
      });

      const resJSON = await res.json();

      if (await resJSON.message === 'Repost already exists') {
        alert(resJSON.message);
      }

      if (await resJSON.message === 'Restore?') {
        const restore = confirm('Repost already exists but was deleted. Do you want to restore it?');
        if (restore) {
            const { RepostState, fieldToFlagRepostsAsRestored } = await import('wrdhom');
            const repostKey = resJSON.repostKey;
            const response = await fetch(`/reposts`+
            `?repostKey=${repostKey.toString()}`,
            {
              headers: {'Cache-Control': 'no-cache'}
            }
          );
          const data: any = await response.json();
          const repostStateJSON = JSON.parse(data.repostState);
          const repostState = RepostState.fromJSON(repostStateJSON) as RepostState;
          const s = await (window as any).mina
                        .signFields({ message: [
                            repostState.hash().toString(),
                            fieldToFlagRepostsAsRestored.toString()
                        ] });
          const signedRepostRestoration = {
            targetKey: targetKey,
            repostKey: repostKey.toString(),
            signedData: s
          }

          const restorationRes = await fetch('/reposts/restore', {
            method: `POST`,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signedRepostRestoration),
          });

          console.log(await restorationRes.text());
        }
      }
    };
  
    return (
      <div>
        <button
          onClick={() => createRepost()}
          className="hover:text-lg ml-3 mr-3"
        >
          <FontAwesomeIcon icon={faRetweet}/>
        </button>
      </div>
    );
}