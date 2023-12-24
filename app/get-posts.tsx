import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";

export default function GetPosts({
  getPosts,
  howManyPosts,
  fromBlock,
  toBlock,
  setProfilePosterAddress,
  hideGetPosts
}: {
  getPosts: boolean,
  howManyPosts: number,
  fromBlock: number,
  toBlock: number,
  setProfilePosterAddress: Dispatch<SetStateAction<string>>,
  hideGetPosts: string
}) {
  const [posts, setPosts] = useState([] as any[]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [selectedPosterAddress, setSelectedPosterAddress] = useState('');
  const [triggerAudit, setTriggerAudit] = useState(false);
  const [whenZeroPosts, setWhenZeroPosts] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setWarningMessage(null);
      setWhenZeroPosts(false);
      const response = await fetch(`/posts`+
        `?howMany=${howManyPosts}`+
        `&fromBlock=${fromBlock}`+
        `&toBlock=${toBlock}`,
        {
          headers: {'Cache-Control': 'no-cache'}
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: any[] = await response.json();
      if (data.length === 0) {
        setLoading(false);
        setWhenZeroPosts(true);
      }
      const { MerkleMapWitness, fetchAccount } = await import('o1js');
      const { PostState } = await import('wrdhom');
      const postsContractData = await fetchAccount({
        publicKey: 'B62qm432JaFjzAdbudBnfunqTtBSaFWCQr4eeWvhW9NWdTeXdG45zcE'
      }, '/graphql');
      const fetchedPostsRoot = postsContractData.account?.zkapp?.appState[2].toString();
      console.log('fetchedPostsRoot: ' + fetchedPostsRoot);

      // Remove post to cause a gap error
      //data.splice(2, 1);

      // Audit that no post is missing at the edges
      if (data.length !== howManyPosts) {
        setWarningMessage(`Expected ${howManyPosts} posts, but got ${data.length}. This could be because there are not\
        as many posts that match your query, but the server could also be censoring posts at the edges of your query\
        (for example, if you expected to get posts 1, 2, 3, 4, and 5; post 1 or post 5 may be missing).` as any);
      }

      const processedData: any[] = data.map( (post: any, index: number) => {
        const postStateJSON = JSON.parse(post.postState);
        const shortPosterAddressStart = postStateJSON.posterAddress.substring(0,7);
        const shortPosterAddressEnd = postStateJSON.posterAddress.slice(-7);
        const shortPosterAddress = `${shortPosterAddressStart}...${shortPosterAddressEnd}`;
        const postWitness = MerkleMapWitness.fromJSON(post.postWitness);
        const postState = PostState.fromJSON(postStateJSON);
        let calculatedPostsRoot = postWitness.computeRootAndKey(postState.hash())[0].toString();

        // Introduce different root to cause a root mismatch
        /*if (index === 0) {
          calculatedPostsRoot = 'badRoot'
        }*/

        // Introduce different block-length to cause block mismatch
        /*if (index === 2) {
          postStateJSON.postBlockHeight = 10000000000;
        }*/

        // Audit that all posts are between the block range in the user query
        if (postStateJSON.postBlockHeight < fromBlock ||  postStateJSON.postBlockHeight > toBlock) {
          throw new Error(`Block-length ${postStateJSON.postBlockHeight} for Post ${postStateJSON.allPostsCounter} isn't between the block range\
          ${fromBlock} to ${toBlock}`);
        }

        // Audit that all roots calculated from the state of each post and their witnesses, match zkApp state
        if (fetchedPostsRoot !== calculatedPostsRoot) {
          throw new Error(`Post ${postStateJSON.allPostsCounter} has different root than zkApp state. The server may be experiencing some issues or\
          manipulating results for your query.`);
        }

        console.log('calculatedPostsRoot: ' + calculatedPostsRoot);
        return {
            postState: postStateJSON,
            postContentID: post.postContentID,
            content: post.content,
            shortPosterAddress: shortPosterAddress,
            postsRoot: calculatedPostsRoot
        }
      });

      setPosts(processedData);
    } catch (e: any) {
        setLoading(false);
        setErrorMessage(e.message);
    }
  };

  const auditNoMissingPosts = async () => {
    try {
      for (let i = 0; i < posts.length -1; i++) {
        if (Number(posts[i].postState.allPostsCounter) !== Number(posts[i+1].postState.allPostsCounter) + 1) {
          throw new Error(`Gap between posts ${posts[i].postState.allPostsCounter} and ${posts[i+1].postState.allPostsCounter}.\
          The server may be experiencing some issues or censoring posts.`)
        }
      }
      setLoading(false);
    } catch (e: any) {
        setLoading(false);
        setErrorMessage(e.message);
    }
  }

  useEffect(() => {
    (async () => {
      await fetchPosts();
      setTriggerAudit(!triggerAudit);
    })();
  }, [getPosts]);

  useEffect(() => {
    (async () => {
      if (posts.length > 0) {
        auditNoMissingPosts();
      }
    })();
  }, [triggerAudit]);

  return (
    <div className={`w-3/5 p-4 overflow-y-auto max-h-[100vh] ${hideGetPosts}`}>
      {loading && <p className="border-4 p-2 shadow-lg">Loading posts...</p>}
      {errorMessage && <p className="border-4 p-2 shadow-lg">Error: {errorMessage}</p>}
      {!loading && warningMessage && <p className="border-4 p-2 shadow-lg">Warning: {warningMessage}</p>}
      {!loading && !errorMessage && Array.isArray(posts) && posts.map((post) => {
        const postIdentifier = post.postState.posterAddress + post.postContentID;
        return (
            <div key={postIdentifier} className="p-2 border-b-2 shadow-lg">
                <div className="flex items-center border-4 p-2 shadow-lg text-xs text-white bg-black">
                  <span 
                    className="mr-2 cursor-pointer hover:underline"
                    onMouseEnter={() => setSelectedPosterAddress(post.postState.posterAddress)}
                    onClick={() => setProfilePosterAddress(selectedPosterAddress)}
                    >
                      <p className="mr-8">{post.shortPosterAddress}</p>
                    </span>
                    <p className="mr-4">{'Post:' + post.postState.allPostsCounter}</p>
                </div>
                <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-all">
                    <p>{post.content}</p>
                </div>
            </div>
        );
      })}
      {whenZeroPosts && <div className="p-2 border-b-2 shadow-lg">
        <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-all">
            <p >The query threw zero posts</p>
        </div>
      </div>}
    </div>
  );
};
