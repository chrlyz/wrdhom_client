import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";

export default function GetProfile({
  getProfile,
  profilePosterAddress,
  profileHowManyPosts,
  profileFromBlock,
  profileToBlock,
  setShowProfile,
  setHideGetPosts
}: {
  getProfile: boolean,
  profilePosterAddress: string,
  profileHowManyPosts: number,
  profileFromBlock: number,
  profileToBlock: number,
  setShowProfile: Dispatch<SetStateAction<boolean>>,
  setHideGetPosts: Dispatch<SetStateAction<string>>
}) {
  const [posts, setPosts] = useState([] as any[]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [triggerAudit, setTriggerAudit] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setWarningMessage(null);
      const response = await fetch(`/profile`+
        `?posterAddress=${profilePosterAddress}`+
        `&howMany=${profileHowManyPosts}`+
        `&profileFromBlock=${profileFromBlock}`+`
        &profileToBlock=${profileToBlock}`,
        {
          headers: {'Cache-Control': 'no-cache'}
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const { MerkleMapWitness, Mina, fetchAccount } = await import('o1js');
      const { PostState } = await import('wrdhom');
      const postsContractData = await fetchAccount({
        publicKey: 'B62qm432JaFjzAdbudBnfunqTtBSaFWCQr4eeWvhW9NWdTeXdG45zcE'
      }, '/graphql');
      const fetchedPostsRoot = postsContractData.account?.zkapp?.appState[2].toString();
      console.log('fetchedPostsRoot: ' + fetchedPostsRoot);
      const data: any[] = await response.json();

      // Remove post to cause a gap error
      //data.splice(2, 1);

      console.log(data);

      // Audit that no post is missing at the edges
      if (data.length !== profileHowManyPosts) {
        setWarningMessage(`Expected ${profileHowManyPosts} posts, but got ${data.length}. This could be because there are not\
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
        if (postStateJSON.postBlockHeight < profileFromBlock ||  postStateJSON.postBlockHeight > profileToBlock) {
          throw new Error(`Block-length ${postStateJSON.postBlockHeight} for Post ${postStateJSON.allPostsCounter} isn't between the block range\
          ${profileFromBlock} to ${profileToBlock}`);
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
        if (Number(posts[i].postState.userPostsCounter) !== Number(posts[i+1].postState.userPostsCounter) + 1) {
          throw new Error(`Gap between user posts ${posts[i].postState.userPostsCounter} and ${posts[i+1].postState.userPostsCounter}.\
          The server may be experiencing some issues or censoring posts.`)
        }
      }
      setLoading(false);
    } catch (e: any) {
        setLoading(false);
        setErrorMessage(e.message);
    }
  }

  const goBack = () => {
    setShowProfile(false);
    setHideGetPosts('');
  }

  useEffect(() => {
    (async () => {
      await fetchPosts();
      setTriggerAudit(!triggerAudit);
    })();
  }, [getProfile]);

  useEffect(() => {
    (async () => {
      if (posts.length > 0) {
        auditNoMissingPosts();
      }
    })();
  }, [triggerAudit]);

  return (
    <div className="w-3/5 p-4 overflow-y-auto max-h-[100vh]">
    <div className="p-2 border-b-2 shadow-lg">
        <button className="m-2" onClick={goBack}>{'<- Go Back'}</button>
        <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-all">
            <p >{`Posts from user:\n\n${profilePosterAddress}`}</p>
        </div>
    </div>
      {loading && <p className="border-4 p-2 shadow-lg">Loading posts...</p>}
      {errorMessage && <p className="border-4 p-2 shadow-lg">Error: {errorMessage}</p>}
      {!loading && warningMessage && <p className="border-4 p-2 shadow-lg">Warning: {warningMessage}</p>}
      {!loading && !errorMessage && Array.isArray(posts) && posts.map((post) => {
        const postIdentifier = post.postState.posterAddress + post.postContentID;
        return (
            <div key={postIdentifier} className="p-2 border-b-2 shadow-lg">
                <div className="flex items-center border-4 p-2 shadow-lg text-xs text-white bg-black">
                    <p className="mr-8">{post.shortPosterAddress}</p>
                    <p className="mr-4">{'User Post: ' + post.postState.userPostsCounter}</p>
                </div>
                <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap">
                    <p>{post.content}</p>
                </div>
            </div>
        );
      })}
    </div>
  );
};