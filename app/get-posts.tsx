import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';

export default function GetPosts() {
  const [posts, setPosts] = useState([] as any[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copyText, setCopyText] = useState('');

  const fetchPosts = async () => {
    try {
      const response = await fetch('/posts?howMany=10');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const { MerkleMapWitness } = await import('o1js');
      const { PostState } = await import('wrdhom');
      const data = await response.json();
      const processedData: any[] = data.map( (post: any, index: number) => {
        const postStateJSON = JSON.parse(post.postState);
        const shortPosterAddressStart = postStateJSON.posterAddress.substring(0,7);
        const shortPosterAddressEnd = postStateJSON.posterAddress.slice(-7);
        const shortPosterAddress = `${shortPosterAddressStart}...${shortPosterAddressEnd}`;
        const postWitness = MerkleMapWitness.fromJSON(post.postWitness);
        const postState = PostState.fromJSON(postStateJSON);
        const postsRoot = postWitness.computeRootAndKey(postState.hash())[0].toString();

        // Introduce different root to cause a root mismatch
        /*let postsRoot = '';
        if (index === 5) {
          postsRoot = 'differentRoot'
        } else {
          postsRoot = postWitness.computeRootAndKey(postState.hash())[0].toString();
        }*/

        console.log('postsRoot: ' + postsRoot);
        return {
            postState: postStateJSON,
            postContentID: post.postContentID,
            content: post.content,
            shortPosterAddress: shortPosterAddress,
            postsRoot: postsRoot
        }
      });

      // Remove post to cause a gap error
      //processedData.splice(5, 1);

      setPosts(processedData);
    } catch (e: any) {
        console.log('fetchPosts');
        setErrorMessage(e.message);
        setError(true);
    }
  };

  const auditPosts = async () => {
    try {
      const postsRoot = posts[0].postsRoot;
      for (let i = 0; i < posts.length -1; i++) {
        if (postsRoot !== posts[i].postsRoot) {
          throw new Error(`Posts ${posts[0].postState.allPostsCounter} and ${posts[i].postState.allPostsCounter} have different root`);
        }
        if (Number(posts[i].postState.allPostsCounter) !== Number(posts[i+1].postState.allPostsCounter) + 1) {
          throw new Error(`Gap between posts ${posts[i].postState.allPostsCounter} and ${posts[i+1].postState.allPostsCounter}`)
        }
      }
    } catch (e: any) {
        console.log('auditNotSkippingPosts');
        setErrorMessage(e.message);
        setError(true);
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
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      auditPosts();
    }
  }, [loading]);

  return (
    <div className="w-3/5 p-4 overflow-y-auto max-h-[90vh]">
      {loading && <p className="border-4 p-2 shadow-lg">Loading posts...</p>}
      {error && <p className="border-4 p-2 shadow-lg">Error: {errorMessage}</p>}
      {Array.isArray(posts) && posts.map((post) => {
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
