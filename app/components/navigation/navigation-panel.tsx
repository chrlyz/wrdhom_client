import { Dispatch, SetStateAction, useState, useEffect } from 'react';

export default function NavigationPanel({
    postsQueries,
    currentPostsQuery,
    setCurrentPostsQuery,
    setPreviousPostsQuery,
    setPosts
}: {
    postsQueries: any[],
    currentPostsQuery: any,
    setCurrentPostsQuery: Dispatch<SetStateAction<any>>,
    setPreviousPostsQuery: Dispatch<SetStateAction<any>>,
    setPosts: Dispatch<SetStateAction<any[]>>
}) {
  const [postsQueryLength, setPostsQueryLength] = useState(0);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    (async () => {
      if (currentPostsQuery && clicked) {
        setClicked(false);
        setPosts(currentPostsQuery.processedPosts);
      }
    })();
  });

  return (
    <div className="flex flex-wrap gap-2 p-4 border-t mt-auto">
      {postsQueries.map((postsQuery, index) => {
        return (<button
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