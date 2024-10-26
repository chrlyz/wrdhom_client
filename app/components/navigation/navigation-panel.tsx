import { Dispatch, SetStateAction, useState, useEffect } from 'react';

export default function NavigationPanel({
    initialPostsQuery,
    postsQueries,
    currentPostsQuery,
    setCurrentPostsQuery,
    previousPostsQuery,
    setPreviousPostsQuery,
    posts,
    setPosts
}: {
    initialPostsQuery: any,
    postsQueries: any[],
    currentPostsQuery: any,
    setCurrentPostsQuery: Dispatch<SetStateAction<any>>,
    previousPostsQuery: any,
    setPreviousPostsQuery: Dispatch<SetStateAction<any>>,
    posts: any[],
    setPosts: Dispatch<SetStateAction<any[]>>
}) {
  const [postsQueryLength, setPostsQueryLength] = useState(0);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    (async () => {
      if(postsQueries.length > postsQueryLength) {
        if (postsQueries.length > 1) {
          setPreviousPostsQuery(currentPostsQuery);
        }
        setCurrentPostsQuery(postsQueries[postsQueries.length-1]);
        setPostsQueryLength(postsQueries.length);
      }
    })();
  });

  useEffect(() => {
    (async () => {
      if (currentPostsQuery && clicked) {
        setClicked(false);
        setPosts(currentPostsQuery.processedPosts);
        console.log('currentPostsQuery.processedPosts')
      }
    })();
  });

  console.log(postsQueries)
  currentPostsQuery && console.log('currentPostsQuery.id:', currentPostsQuery);
  return (
    <div className="flex flex-wrap gap-2 p-4 border-t mt-auto">
      {postsQueries.map((postsQuery, index) => (
        <button
          key={index}
          onClick={() => {
            if (postsQueries.length > 1) {
              setPreviousPostsQuery(currentPostsQuery);
            }
            setCurrentPostsQuery(postsQuery);
            setClicked(true);
          }}
          className={`
            w-8 h-8 
            transition-all duration-200 ease-in-out
            hover:opacity-80
            ${
              currentPostsQuery
              && currentPostsQuery.postsAuditMetadata.hashedQuery === postsQuery.postsAuditMetadata.hashedQuery
              && currentPostsQuery.postsAuditMetadata.hashedState === postsQuery.postsAuditMetadata.hashedState
              && currentPostsQuery.postsAuditMetadata.atBlockHeight === postsQuery.postsAuditMetadata.atBlockHeight
              ? 'bg-black' : 'bg-gray-300'
            }
          `}
        />
      ))}
    </div>
  );
};