import { Dispatch, SetStateAction, useState, useEffect } from 'react';
import { auditItems } from './utils/audit';
import { updateQuery, getQuery, addQuery } from '@/app/db/indexed-db';

export default function AuditButton({
  currentQuery,
  postsContractAddress,
  reactionsContractAddress,
  commentsContractAddress,
  repostsContractAddress,
  setAuditing,
  setErrorMessage,
  setQueries,
  auditing
}: {
  currentQuery: any,
  postsContractAddress: string,
  reactionsContractAddress: string,
  commentsContractAddress: string,
  repostsContractAddress: string,
  setAuditing: Dispatch<SetStateAction<boolean>>,
  setErrorMessage: Dispatch<SetStateAction<any>>,
  setQueries: Dispatch<SetStateAction<any[]>>,
  auditing: boolean
}) {
  const [clicked, setClicked] = useState(false);

  const updatePostsQueriesWithAudit = (
    index: number,
    isValid: boolean
  ) => {
      setQueries(prevPostsQueries => {
        const newPostsQueries = [...prevPostsQueries];
        newPostsQueries[index] = {...currentQuery, ...{isValid: isValid}};
        return newPostsQueries;
      });
  }

  useEffect(() => {
  (async () => {
      if (currentQuery && clicked) {
          setClicked(false);

          const auditGeneralParams = {
          items: currentQuery.processedItems,
          itemsMetadata: currentQuery.auditMetadata,
          fromBlock: currentQuery.fromBlock,
          toBlock: currentQuery.toBlock,
          setAuditing: setAuditing,
          setErrorMessage: setErrorMessage,
          postsContractAddress: postsContractAddress,
          reactionsContractAddress: reactionsContractAddress,
          commentsContractAddress: commentsContractAddress,
          repostsContractAddress: repostsContractAddress,
        }

        if (currentQuery.feedType === 'profile') {
          
          const isValid = await auditItems('profile', 'Posts', auditGeneralParams);
          updatePostsQueriesWithAudit(currentQuery.id-1, isValid);

          const query = await getQuery(
            currentQuery.auditMetadata.hashedQuery,
            currentQuery.auditMetadata.atBlockHeight
          );

          if (query) {
            await updateQuery(currentQuery.id, {isValid: isValid});
          } else {
            await addQuery({...currentQuery, ...{isValid: isValid}});
          }

        } else if (currentQuery.feedType === 'global') {

            const isValid = await auditItems('global', 'Posts', auditGeneralParams);
            updatePostsQueriesWithAudit(currentQuery.id-1, isValid);

            const query = await getQuery(
              currentQuery.auditMetadata.hashedQuery,
              currentQuery.auditMetadata.atBlockHeight
            );

            if (query) {
              await updateQuery(currentQuery.id, {isValid: isValid});
            } else {
              await addQuery({...currentQuery, ...{isValid: isValid}});
            }
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
          if (currentQuery.isValid === undefined) {
            setClicked(true);
            setAuditing(true);
          }
        }}
      >Audit</button>
      {auditing && <p className="border-4 p-2 shadow-lg">Auditing...</p>}
    </div>
  );
}