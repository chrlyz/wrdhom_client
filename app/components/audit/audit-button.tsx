import { Dispatch, SetStateAction, useState, useEffect } from 'react';
import { auditItems } from './utils/audit';
import { updateQuery, getQuery, addQuery } from '@/app/db/indexed-db';
import { ContentType } from '../types';

export default function AuditButton({
  currentQuery,
  postsContractAddress,
  reactionsContractAddress,
  commentsContractAddress,
  repostsContractAddress,
  setAuditing,
  setErrorMessage,
  setQueries,
  auditing,
  setCurrentQuery
}: {
  currentQuery: any,
  postsContractAddress: string,
  reactionsContractAddress: string,
  commentsContractAddress: string,
  repostsContractAddress: string,
  setAuditing: Dispatch<SetStateAction<boolean>>,
  setErrorMessage: Dispatch<SetStateAction<any>>,
  setQueries: Dispatch<SetStateAction<any[]>>,
  auditing: boolean,
  setCurrentQuery: Dispatch<SetStateAction<any>>
}) {
  const [clicked, setClicked] = useState(false);

  const updateQueriesWithAudit = (
    index: number,
    isValid: boolean,
    contentType: ContentType
  ) => {
      if (contentType === 'Posts') {
        setCurrentQuery((prevQuery: any) => {
          const newQuery = {...prevQuery, ...{posts: {...prevQuery.posts, isValid: isValid}}};
          setQueries(prevQueries => {
            const newQueries = [...prevQueries];
            setCurrentQuery(newQuery);
            newQueries[index] = newQuery;
            return newQueries;
          });
          return newQuery
        });
      } else if (contentType === 'Reposts') {
        setCurrentQuery((prevQuery: any) => {
          const newQuery = {...prevQuery, ...{reposts: {...prevQuery.reposts, isValid: isValid}}};
          setQueries(prevQueries => {
            const newQueries = [...prevQueries];
            newQueries[index] = newQuery;
            return newQueries;
          });
          return newQuery;
        });
      } else if (contentType === 'Comments') {
        setCurrentQuery((prevQuery: any) => {
          const newQuery = {...prevQuery, ...{comments: {...prevQuery.comments, isValid: isValid}}};
          setQueries(prevQueries => {
            const newQueries = [...prevQueries];
            newQueries[index] = newQuery;
            return newQueries;
          });
          return newQuery;
        });
      }
  }

  useEffect(() => {
  (async () => {
      if (currentQuery && clicked) {
        setClicked(false);

        let postsAuditGeneralParams;
        if (currentQuery.posts.processedItems.length > 0) {
          postsAuditGeneralParams = {
            items: currentQuery.posts.processedItems,
            itemsMetadata: currentQuery.posts.auditMetadata,
            fromBlock: currentQuery.posts.auditMetadata.query.fromBlock,
            toBlock: currentQuery.posts.auditMetadata.query.toBlock,
            setAuditing: setAuditing,
            setErrorMessage: setErrorMessage,
            postsContractAddress: postsContractAddress,
            reactionsContractAddress: reactionsContractAddress,
            commentsContractAddress: commentsContractAddress,
            repostsContractAddress: repostsContractAddress
          }

          if (currentQuery.feedType === 'profile') {
            const isValid = await auditItems('profile', 'Posts', postsAuditGeneralParams);
            updateQueriesWithAudit(currentQuery.id-1, isValid, 'Posts');
  
            const query = await getQuery(
              currentQuery.compositeHashedQuery
            );
  
            if (query) {
              await updateQuery(currentQuery.id, {posts: {...currentQuery.posts, isValid: isValid}});
            } else {
              await addQuery({...currentQuery, ...{posts: {...currentQuery.posts, isValid: isValid}}});
            }
  
          } else if (currentQuery.feedType === 'global') {
              const isValid = await auditItems('global', 'Posts', postsAuditGeneralParams);
              updateQueriesWithAudit(currentQuery.id-1, isValid, 'Posts');
  
              const query = await getQuery(
                currentQuery.compositeHashedQuery
              );
  
              if (query) {
                await updateQuery(currentQuery.id, {posts: {...currentQuery.posts, isValid: isValid, update: 'update'}});
              } else {
                await addQuery({...currentQuery, ...{posts: {...currentQuery.posts, isValid: isValid, add: 'add'}}});
              }
  
          }
        }

        let repostsAuditGeneralParams;
        if (currentQuery.reposts.processedItems.length > 0) {
          repostsAuditGeneralParams = {
            items: currentQuery.reposts.processedItems,
            itemsMetadata: currentQuery.reposts.auditMetadata,
            fromBlock: currentQuery.reposts.auditMetadata.query.fromBlock,
            toBlock: currentQuery.reposts.auditMetadata.query.toBlock,
            setAuditing: setAuditing,
            setErrorMessage: setErrorMessage,
            postsContractAddress: postsContractAddress,
            reactionsContractAddress: reactionsContractAddress,
            commentsContractAddress: commentsContractAddress,
            repostsContractAddress: repostsContractAddress
          }

          if (currentQuery.feedType === 'profile') {
          
            const isValid = await auditItems('profile', 'Reposts', repostsAuditGeneralParams);
            updateQueriesWithAudit(currentQuery.id-1, isValid, 'Reposts');
  
            const query = await getQuery(
              currentQuery.compositeHashedQuery
            );
  
            if (query) {
              await updateQuery(currentQuery.id, {reposts: {...currentQuery.reposts, isValid: isValid}});
            } else {
              await addQuery({...currentQuery, ...{reposts: {...currentQuery.reposts, isValid: isValid}}});
            }
  
          } else if (currentQuery.feedType === 'global') {
  
              const isValid = await auditItems('global', 'Reposts', repostsAuditGeneralParams);
              updateQueriesWithAudit(currentQuery.id-1, isValid, 'Reposts');
  
              const query = await getQuery(
                currentQuery.compositeHashedQuery
              );
  
              if (query) {
                await updateQuery(currentQuery.id, {reposts: {...currentQuery.reposts, isValid: isValid}});
              } else {
                await addQuery({...currentQuery, ...{reposts: {...currentQuery.reposts, isValid: isValid}}});
              }
  
          }
        }

        let commentsAuditGeneralParams;
        if (currentQuery.comments.processedItems.length > 0) {
          commentsAuditGeneralParams = {
            items: currentQuery.comments.processedItems,
            itemsMetadata: currentQuery.comments.auditMetadata,
            fromBlock: currentQuery.comments.auditMetadata.query.fromBlock,
            toBlock: currentQuery.comments.auditMetadata.query.toBlock,
            setAuditing: setAuditing,
            setErrorMessage: setErrorMessage,
            postsContractAddress: postsContractAddress,
            reactionsContractAddress: reactionsContractAddress,
            commentsContractAddress: commentsContractAddress,
            repostsContractAddress: repostsContractAddress
          }
          
          const isValid = await auditItems('comments', 'Comments', commentsAuditGeneralParams, currentQuery.commentTarget);
          updateQueriesWithAudit(currentQuery.id-1, isValid, 'Comments');

          const query = await getQuery(
            currentQuery.compositeHashedQuery
          );

          if (query) {
            await updateQuery(currentQuery.id, {comments: {...currentQuery.comments, isValid: isValid}});
          } else {
            await addQuery({...currentQuery, ...{comments: {...currentQuery.comments, isValid: isValid}}});
  
          }
        }

        setAuditing(false);
      }
    })();
  });
  
  return (
    <div className="p-4 w-full">
      <button
        className="w-full p-2 bg-black text-white"
        onClick={() => {
          if (
            currentQuery.posts.isValid === undefined
            && currentQuery.reposts.isValid === undefined
            && currentQuery.comments.isValid === undefined
          ) {
            setClicked(true);
            setAuditing(true);
          }
        }}
      >
        Audit Query
      </button>
      {auditing && <p className="border-4 p-2 shadow-lg">Auditing...</p>}
    </div>
  );
}