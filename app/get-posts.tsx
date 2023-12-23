import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import QuerySettings from './query-settings';

export default function GetPosts({
  walletConnected
}: {
  walletConnected: boolean
}) {
  const [posts, setPosts] = useState([] as any[]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [copyText, setCopyText] = useState('');
  const [visibleSettings, setVisibleSettings] = useState(false);
  const [getPosts, setGetPosts] = useState(false);
  const [howManyPosts, setHowManyPosts] = useState(10);
  const [fromBlock, setFromBlock] = useState(24_402);
  const [toBlock, setToBlock] = useState(100_000);

  const showSettings = () => setVisibleSettings(!visibleSettings);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setWarningMessage(null);
      const response = await fetch(`/posts?howMany=${howManyPosts}&fromBlock=${fromBlock}&toBlock=${toBlock}`,
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
      //processedData.splice(2, 1);

      // Audit that no post is missing at the edges
      if (data.length !== howManyPosts) {
        setWarningMessage(`Expected ${howManyPosts} posts, but got ${data.length}. This could be because there are not\
        as many posts that match your query, but the server could also be censoring posts at the edges of your query\
        (e.g. If you requested 3 posts, posts 1 or 3 could be missing).` as any);
      }

      const processedData: any[] = data.map( (post: any, index: number) => {
        const postStateJSON = JSON.parse(post.postState);
        const shortPosterAddressStart = postStateJSON.posterAddress.substring(0,7);
        const shortPosterAddressEnd = postStateJSON.posterAddress.slice(-7);
        const shortPosterAddress = `${shortPosterAddressStart}...${shortPosterAddressEnd}`;
        const postWitness = MerkleMapWitness.fromJSON(post.postWitness);
        const postState = PostState.fromJSON(postStateJSON);
        let calculatedPostsRoot = postWitness.computeRootAndKey(postState.hash())[0].toString();
        console.log('calculatedPostsRoot: ' + calculatedPostsRoot);

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
      if (posts.length > 0) {
        auditNoMissingPosts();
      }
      setLoading(false);
    })();
  }, [getPosts]);

  return (
    <div className="flex w-full">
      <div className="w-3/4 p-4 overflow-y-auto max-h-[90vh]">
        {loading && <p className="border-4 p-2 shadow-lg">Loading posts...</p>}
        {errorMessage && <p className="border-4 p-2 shadow-lg">Error: {errorMessage}</p>}
        {warningMessage && !errorMessage && <p className="border-4 p-2 shadow-lg">Warning: {warningMessage}</p>}
        {!loading && !errorMessage && Array.isArray(posts) && posts.map((post) => {
          const postIdentifier = post.postState.posterAddress + post.postContentID;
          return (
              <div key={postIdentifier} className="p-2 border-b-2 shadow-lg">
                  <div className="flex items-center border-4 p-2 shadow-lg text-xs text-white bg-black"
                  style={{ borderBottomWidth: '2px' }}
                  >
                    <span 
                      className="mr-2 cursor-pointer"
                      onMouseEnter={() => handleMouseEnter(post.postState.posterAddress)}
                      onClick={copyToClipboard}
                      >
                        <FontAwesomeIcon icon={faCopy}  />
                      </span>
                      <p className="mr-8">{post.shortPosterAddress}</p>
                      <p className="mr-4">{'Post:' + post.postState.allPostsCounter}</p>
                  </div>
                  <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap">
                      <p>{post.content}</p>
                  </div>
              </div>
          );
        })}
      </div>
      <div className="flex flex-col w-1/4 border-r">
        <div className="flex-grow">
          {loading? null : walletConnected && <QuerySettings
            visibleSettings={visibleSettings}
            showSettings={showSettings}
            howManyPosts={howManyPosts}
            setHowManyPosts={setHowManyPosts}
            fromBlock={fromBlock}
            setFromBlock={setFromBlock}
            toBlock={toBlock}
            setToBlock={setToBlock}
          />}
        </div>
        {walletConnected && (<div className="p-4 w-full mb-32">
          <button 
            className="w-full p-2 bg-black text-white"
            onClick={() => setGetPosts(!getPosts)}>
            Update feed
          </button>
        </div>)}
      </div>
    </div>
  );
};
