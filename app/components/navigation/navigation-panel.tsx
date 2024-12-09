import { Dispatch, SetStateAction, useState, useEffect } from 'react';
import { FeedType } from '../types';

export default function NavigationPanel({
    queries,
    currentQuery,
    setCurrentQuery,
    setPosts,
    setProfilePosts,
    setProfileAddress,
    setShowProfile,
    setCommentTarget,
    setHideGetGlobalPosts,
    setFeedType,
    setComments,
    setShowComments,
    setMergedContent
}: {
    queries: any[],
    currentQuery: any,
    setCurrentQuery: Dispatch<SetStateAction<any>>,
    setPosts: Dispatch<SetStateAction<any[]>>,
    setProfilePosts: Dispatch<SetStateAction<any[]>>,
    setProfileAddress: Dispatch<SetStateAction<string>>,
    setShowProfile: Dispatch<SetStateAction<boolean>>,
    setCommentTarget: Dispatch<SetStateAction<any>>,
    setHideGetGlobalPosts: Dispatch<SetStateAction<string>>,
    setFeedType: Dispatch<SetStateAction<FeedType>>,
    setComments: Dispatch<SetStateAction<any[]>>,
    setShowComments: Dispatch<SetStateAction<boolean>>,
    setMergedContent: Dispatch<SetStateAction<any[]>>
}) {
  const [clicked, setClicked] = useState(false);
  
  const areQueriesEqual = (query1: any, query2: any) => {
    if (!query1 || !query2) return false;
    
    return query1.compositeHashedQuery === query2.compositeHashedQuery
  };

  useEffect(() => {
    (async () => {
      if (currentQuery && clicked) {

        setClicked(false);
        

        if (currentQuery.feedType === 'profile') {
          setProfilePosts(currentQuery.processedItems);
          setProfileAddress(currentQuery.profileAddress);
          setFeedType('profile');
        } else if (currentQuery.feedType === 'global') {
          setMergedContent(currentQuery.mergedAndSorted);
          setProfileAddress('');
          setShowProfile(false);
          setShowComments(false);
          setCommentTarget(null);
          setHideGetGlobalPosts('');
          setFeedType('global');
        } else if (currentQuery.feedType === 'comments') {
          setComments(currentQuery.processedItems);
          setCommentTarget(currentQuery.commentsTarget);
          setShowProfile(false);
          setShowComments(true);
          setFeedType('comments');
        }
      }
    })();
  });

  return (
    <div className="flex flex-wrap gap-2 p-4 border-t mt-10">
      {queries.map((query, index) => {
        return (<button
          key={index}
          onClick={() => {
            setCurrentQuery(query);
            setClicked(true);
          }}
          className={`
            w-8 h-8 
            transition-all duration-200 ease-in-out
            hover:opacity-80
            ${
              query.isValid && areQueriesEqual(currentQuery, query) ? 'bg-green-700'
              : areQueriesEqual(currentQuery, query) ? 'bg-black'
              : query.isValid ? 'bg-green-500' : 'bg-gray-300'
            }
          `}
        />)
      })}
    </div>
  );
};