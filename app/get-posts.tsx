import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';

export default function GetPosts({
  getPosts,
  howManyPosts
}: {
  getPosts: boolean,
  howManyPosts: number
}) {
  const [posts, setPosts] = useState([] as any[]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [copyText, setCopyText] = useState('');
  const [auditTrigger, setAuditTrigger] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const response = await fetch(`/posts?howMany=${howManyPosts}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const { MerkleMapWitness, Mina, fetchAccount } = await import('o1js');
      const { PostState } = await import('wrdhom');
      const postsContractData = await fetchAccount({
        publicKey: 'B62qrNHa8tfKVEigCAcgKTipwu63k37HY4ZWwv8epLGsuXcn8CsMkW3'
      }, '/graphql');
      const fetchedPostsRoot = postsContractData.account?.zkapp?.appState[2].toString();
      console.log('fetchedPostsRoot: ' + fetchedPostsRoot);
      const data = await response.json();
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

        // Audit that all roots calculated from the state of each post and their witnesses, match zkApp state
        if (fetchedPostsRoot !== calculatedPostsRoot) {
          throw new Error(`Failed response audit. Post ${postStateJSON.allPostsCounter} has different root than zkApp state`);
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

      // Remove post to cause a gap error
      //processedData.splice(1, 1);

      // Audit that no post is missing at the edges
      if (processedData.length !== howManyPosts) {
        throw Error(`Failed response audit. Expected ${howManyPosts} posts, but got ${processedData.length}`);
      }

      setPosts(processedData);
    } catch (e: any) {
        setErrorMessage(e.message);
    }
  };

  const auditNoMissingPosts = async () => {
    try {
      for (let i = 0; i < posts.length -1; i++) {
        if (Number(posts[i].postState.allPostsCounter) !== Number(posts[i+1].postState.allPostsCounter) + 1) {
          throw new Error(`Failed response audit. Gap between posts ${posts[i].postState.allPostsCounter} and ${posts[i+1].postState.allPostsCounter}`)
        }
      }
    } catch (e: any) {
        setErrorMessage(e.message);
    }
  }
    

  const handleMouseEnter = (posterAddress: string) => {
    setCopyText(posterAddress);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(copyText);
  };

  useEffect(() => {
    (async () => {
      await fetchPosts();
      setAuditTrigger(!auditTrigger);
      setLoading(false);
    })();
  }, [getPosts]);

  useEffect(() => {
    if (posts.length > 0) {
      auditNoMissingPosts();
    }
  }, [auditTrigger]);

  return (
    <div className="w-3/5 p-4 overflow-y-auto max-h-[90vh]">
      {loading && <p className="border-4 p-2 shadow-lg">Loading posts...</p>}
      {errorMessage && <p className="border-4 p-2 shadow-lg">Error: {errorMessage}</p>}
      {!loading && Array.isArray(posts) && posts.map((post) => {
        const postIdentifier = post.postState.posterAddress + post.postContentID;
        return (
            <div key={postIdentifier} className="p-2 border-b-2 shadow-lg">
                <div className="flex items-center border-4 p-2 shadow-lg text-xs text-white bg-black"
                style={{ borderBottomWidth: '2px' }}
                >
                    <p className="mr-4">{'Account:' + post.shortPosterAddress}</p>
                    <span 
                    className="mr-4 cursor-pointer"
                    onMouseEnter={() => handleMouseEnter(post.postState.posterAddress)}
                    onClick={copyToClipboard}
                    >
                      <FontAwesomeIcon icon={faCopy}  />
                    </span>
                    <p className="mr-4">{'Post:' + post.postState.allPostsCounter}</p>
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
