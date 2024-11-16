import { Dispatch, SetStateAction, useState, useEffect } from 'react';
import { auditItems } from './utils/audit';
import { updatePostsQuery, getPostsQuery, addPostsQuery } from '@/app/db/indexed-db';

export default function AuditButton({
  currentPostsQuery,
  postsContractAddress,
  reactionsContractAddress,
  commentsContractAddress,
  repostsContractAddress,
  setAuditing,
  setErrorMessage,
  setPostsQueries,
  auditing
}: {
  currentPostsQuery: any,
  postsContractAddress: string,
  reactionsContractAddress: string,
  commentsContractAddress: string,
  repostsContractAddress: string,
  setAuditing: Dispatch<SetStateAction<boolean>>,
  setErrorMessage: Dispatch<SetStateAction<any>>,
  setPostsQueries: Dispatch<SetStateAction<any[]>>,
  auditing: boolean
}) {
  const [clicked, setClicked] = useState(false);

  const updatePostsQueriesWithAudit = (
    index: number,
    isValid: boolean
  ) => {
      setPostsQueries(prevPostsQueries => {
        const newPostsQueries = [...prevPostsQueries];
        newPostsQueries[index] = {...currentPostsQuery, ...{isValid: isValid}};
        return newPostsQueries;
      });
  }

  useEffect(() => {
  (async () => {
      if (currentPostsQuery && clicked) {
          setClicked(false);

          const auditGeneralParams = {
          items: currentPostsQuery.processedPosts,
          itemsMetadata: currentPostsQuery.postsAuditMetadata,
          fromBlock: currentPostsQuery.fromBlock,
          toBlock: currentPostsQuery.toBlock,
          setAuditing: setAuditing,
          setErrorMessage: setErrorMessage,
          postsContractAddress: postsContractAddress,
          reactionsContractAddress: reactionsContractAddress,
          commentsContractAddress: commentsContractAddress,
          repostsContractAddress: repostsContractAddress,
        }

        if (currentPostsQuery.feedType === 'profile') {
          
          const isValid = await auditItems('profile', 'Posts', auditGeneralParams);
          updatePostsQueriesWithAudit(currentPostsQuery.id-1, isValid);

          const postsQuery = await getPostsQuery(
            currentPostsQuery.postsAuditMetadata.hashedQuery,
            currentPostsQuery.postsAuditMetadata.atBlockHeight
          );

          if (postsQuery) {
            await updatePostsQuery(currentPostsQuery.id, {isValid: isValid});
          } else {
            await addPostsQuery({...currentPostsQuery, ...{isValid: isValid}});
          }

        } else if (currentPostsQuery.feedType === 'global') {
            const isValid = await auditItems('global', 'Posts', auditGeneralParams);
            updatePostsQueriesWithAudit(currentPostsQuery.id-1, isValid);
            await updatePostsQuery(currentPostsQuery.id, {isValid: isValid});
        }

        setAuditing(false);
      }
    })();
  });
  
  return (
    <div className="p-4 w-full mb-32">
      <button
        className="w-full p-2 bg-black text-white"
        onClick={() => {
          if (currentPostsQuery.isValid === undefined) {
            setClicked(true);
            setAuditing(true);
          }
        }}
      >Audit</button>
      {auditing && <p className="border-4 p-2 shadow-lg">Auditing...</p>}
    </div>
  );
}