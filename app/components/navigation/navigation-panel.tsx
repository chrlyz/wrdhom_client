import { Dispatch, SetStateAction, useEffect } from 'react';
import { FeedType } from '../types';

export default function NavigationPanel({
    queries,
    currentQuery,
    setCurrentQuery,
    setProfileAddress,
    setShowProfile,
    setCommentTarget,
    setHideGetGlobalPosts,
    setFeedType,
    setComments,
    setShowComments,
    setMergedContent,
    setSelectedNavigation,
    selectedNavigation
}: {
    queries: any[],
    currentQuery: any,
    setCurrentQuery: Dispatch<SetStateAction<any>>,
    setProfileAddress: Dispatch<SetStateAction<string>>,
    setShowProfile: Dispatch<SetStateAction<boolean>>,
    setCommentTarget: Dispatch<SetStateAction<any>>,
    setHideGetGlobalPosts: Dispatch<SetStateAction<string>>,
    setFeedType: Dispatch<SetStateAction<FeedType>>,
    setComments: Dispatch<SetStateAction<any[]>>,
    setShowComments: Dispatch<SetStateAction<boolean>>,
    setMergedContent: Dispatch<SetStateAction<any[]>>,
    setSelectedNavigation: Dispatch<SetStateAction<boolean>>,
    selectedNavigation: boolean
}) {
  
  const areQueriesEqual = (query1: any, query2: any) => {
    if (!query1 || !query2) return false;
    
    return query1.compositeHashedQuery === query2.compositeHashedQuery
  };

  useEffect(() => {
    (async () => {
      if (currentQuery && selectedNavigation) {

        setSelectedNavigation(false);
        

        if (currentQuery.feedType === 'profile') {
          setMergedContent(currentQuery.mergedAndSorted);
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
          setComments(currentQuery.comments.processedItems);
          setCommentTarget(currentQuery.commentTarget);
          setShowProfile(false);
          setFeedType('comments');
        }
      }
    })();
  });

  return (
    <div className="flex flex-wrap gap-2 p-4 border-t mt-10">
      {queries.map((query, index) => {
        let backGroundColor = '';
        
        if (
          query.posts.isValid
          && query.reposts.isValid
          && areQueriesEqual(currentQuery, query)
        ) {
          backGroundColor = 'bg-green-700';
        } else if (
          query.posts.isValid
          && query.reposts.processedItems.length === 0
          && areQueriesEqual(currentQuery, query)
        ) {
          backGroundColor = 'bg-green-700';
        } else if (
          query.posts.processedItems.length === 0
          && query.reposts.isValid
          && areQueriesEqual(currentQuery, query)
        ) {
          backGroundColor = 'bg-green-700';
        } else if (
          query.posts.isValid
          && query.reposts.isValid
        ) {
          backGroundColor = 'bg-green-500';
        } else if (
          query.posts.isValid
          && query.reposts.processedItems.length === 0
        ) {
          backGroundColor = 'bg-green-500';
        } else if (
          query.posts.processedItems.length === 0
          && query.reposts.isValid
        ) {
          backGroundColor = 'bg-green-500';
        } else if (
          query.comments.isValid
          && areQueriesEqual(currentQuery, query)
        ) {
          backGroundColor = 'bg-green-700';
        } else if (
          query.comments.isValid
        ) {
          backGroundColor = 'bg-green-500';
        }

        else if (
          query.posts.isValid !== undefined
          && !query.posts.isValid
          && query.reposts.isValid !== undefined
          && !query.reposts.isValid
          && areQueriesEqual(currentQuery, query)
        ) {
          backGroundColor = 'bg-red-700';
        } else if (
          query.posts.isValid !== undefined
          && !query.posts.isValid
          && query.reposts.isValid === undefined
          && areQueriesEqual(currentQuery, query)
        ) {
          backGroundColor = 'bg-red-700';
        } else if (
          query.posts.isValid === undefined
          && query.reposts.isValid !== undefined
          && !query.reposts.isValid
          && areQueriesEqual(currentQuery, query)
        ) {
          backGroundColor = 'bg-red-700';
        } else if (
          query.comments.isValid !== undefined
          && !query.comments.isValid
          && areQueriesEqual(currentQuery, query)
        ) {
          backGroundColor = 'bg-red-700';
        } else if (
          query.posts.isValid !== undefined
          && !query.posts.isValid
          && query.reposts.isValid
          && areQueriesEqual(currentQuery, query)
        ) {
          backGroundColor = 'bg-red-700';
        } else if (
          query.posts.isValid
          && query.reposts.isValid !== undefined
          && !query.reposts.isValid
          && areQueriesEqual(currentQuery, query)
        ) {
          backGroundColor = 'bg-red-700';
        }
        
        else if (
          query.posts.isValid !== undefined
          && !query.posts.isValid
          && query.reposts.isValid !== undefined
          && !query.reposts.isValid
        ) {
          backGroundColor = 'bg-red-500';
        } else if (
          query.posts.isValid !== undefined
          && !query.posts.isValid
          && query.reposts.isValid === undefined
        ) {
          backGroundColor = 'bg-red-500';
        } else if (
          query.posts.isValid === undefined
          && query.reposts.isValid !== undefined
          && !query.reposts.isValid
        ) {
          backGroundColor = 'bg-red-500';
        } else if (
          query.comments.isValid !== undefined
          && !query.comments.isValid
        ) {
          backGroundColor = 'bg-red-500';
        } else if (
          query.posts.isValid !== undefined
          && !query.posts.isValid
          && query.reposts.isValid
        ) {
          backGroundColor = 'bg-red-500';
        } else if (
          query.posts.isValid
          && query.reposts.isValid !== undefined
          && !query.reposts.isValid
        ) {
          backGroundColor = 'bg-red-500';
        }
        
        else if (
          areQueriesEqual(currentQuery, query)
        ) {
          backGroundColor = 'bg-black';
        } else {
          backGroundColor = 'bg-gray-300';
        }
  
        return (
          <button
            key={index}
            onClick={() => {
              setCurrentQuery(query);
              setSelectedNavigation(true);
            }}
            className={`
              w-8 h-8 
              transition-all duration-200 ease-in-out
              hover:opacity-80
              ${backGroundColor}
            `}
          />
        );
      })}
    </div>
  );
};