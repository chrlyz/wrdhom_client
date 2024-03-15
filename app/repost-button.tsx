import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRetweet } from '@fortawesome/free-solid-svg-icons';

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

      console.log(await res.text());
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