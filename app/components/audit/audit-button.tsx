import { Dispatch, SetStateAction, useState, useEffect } from 'react';
import { auditItems } from './utils/audit';
import { updatePostsQuery } from '@/app/db/indexed-db';

export default function AuditButton({
  currentPostsQuery,
  postsContractAddress,
  reactionsContractAddress,
  commentsContractAddress,
  repostsContractAddress,
  setAuditing,
  setErrorMessage
}: {
  currentPostsQuery: any,
  postsContractAddress: string,
  reactionsContractAddress: string,
  commentsContractAddress: string,
  repostsContractAddress: string,
  setAuditing: Dispatch<SetStateAction<boolean>>,
  setErrorMessage: Dispatch<SetStateAction<any>>,
}) {
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
  (async () => {
      if (currentPostsQuery && clicked) {
          setClicked(false);

          const auditGeneralParams = {
          items: currentPostsQuery.processedPosts,
          fromBlock: currentPostsQuery.fromBlock,
          toBlock: currentPostsQuery.toBlock,
          setAuditing: setAuditing,
          setErrorMessage: setErrorMessage,
          postsContractAddress: postsContractAddress,
          reactionsContractAddress: reactionsContractAddress,
          commentsContractAddress: commentsContractAddress,
          repostsContractAddress: repostsContractAddress,
        }

        console.log('auditing')
        console.log(currentPostsQuery)
        if (currentPostsQuery.feedType === 'profile') {
          const isValid = await auditItems('profile', 'Posts', auditGeneralParams);
          await updatePostsQuery(currentPostsQuery.id, {isValid: isValid});
        } else if (currentPostsQuery.feedType === 'global') {
            const isValid = await auditItems('global', 'Posts', auditGeneralParams);
            await updatePostsQuery(currentPostsQuery.id, {isValid: isValid});
        }

        setAuditing(false);
      }
    })();
  });
  
  return (
    <div className="w-full p-2 border-b-2 shadow-lg">
      <button
        className="w-full p-1 bg-black text-white"
        onClick={() => {
          if (currentPostsQuery.isValid === undefined) {
            setClicked(true);
            setAuditing(true);
          }
        }}
      >Audit</button>
    </div>
  );
}