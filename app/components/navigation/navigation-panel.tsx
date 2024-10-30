import { Dispatch, SetStateAction, useState, useEffect } from 'react';
import { FeedType } from '../types';

export default function NavigationPanel({
    postsQueries,
    currentPostsQuery,
    setCurrentPostsQuery,
    setPosts,
    setProfilePosts,
    setProfileAddress,
    setShowProfile,
    setCommentTarget,
    setHideGetGlobalPosts,
    setFeedType
}: {
    postsQueries: any[],
    currentPostsQuery: any,
    setCurrentPostsQuery: Dispatch<SetStateAction<any>>,
    setPosts: Dispatch<SetStateAction<any[]>>,
    setProfilePosts: Dispatch<SetStateAction<any[]>>,
    setProfileAddress: Dispatch<SetStateAction<string>>,
    setShowProfile: Dispatch<SetStateAction<boolean>>,
    setCommentTarget: Dispatch<SetStateAction<any>>,
    setHideGetGlobalPosts: Dispatch<SetStateAction<string>>,
    setFeedType: Dispatch<SetStateAction<FeedType>>
}) {
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    (async () => {
      if (currentPostsQuery && clicked) {

        setClicked(false);
        

        if (currentPostsQuery.feedType === 'profile') {
          setProfilePosts(currentPostsQuery.processedPosts);
          setProfileAddress(currentPostsQuery.profileAddress);
          setFeedType('profile');
        } else if (currentPostsQuery.feedType === 'global') {
          setPosts(currentPostsQuery.processedPosts);
          setProfileAddress('');
          setShowProfile(false);
          setCommentTarget(null);
          setHideGetGlobalPosts('');
          setFeedType('global');
        }
      }
    })();
  });
  console.log('navigation')
  console.log(currentPostsQuery)

  return (
    <div className="flex flex-wrap gap-2 p-4 border-t mt-auto">
      {postsQueries.map((postsQuery, index) => {
        return (<button
          key={index}
          onClick={() => {
            setCurrentPostsQuery(postsQuery);
            setClicked(true);
          }}
          className={`
            w-8 h-8 
            transition-all duration-200 ease-in-out
            hover:opacity-80
            ${
              currentPostsQuery && postsQuery
              && currentPostsQuery.postsAuditMetadata.hashedQuery === postsQuery.postsAuditMetadata.hashedQuery
              && currentPostsQuery.postsAuditMetadata.hashedState === postsQuery.postsAuditMetadata.hashedState
              && currentPostsQuery.postsAuditMetadata.atBlockHeight === postsQuery.postsAuditMetadata.atBlockHeight
              ? 'bg-black' : 'bg-gray-300'
            }
          `}
        />)
      })}
    </div>
  );
};