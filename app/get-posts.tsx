import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';

export default function GetPosts() {
  const [posts, setPosts] = useState([] as any[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copyText, setCopyText] = useState('');

  const fetchPosts = async () => {
    try {
      const response = await fetch('/posts?howMany=2');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const { MerkleMapWitness } = await import('o1js');
      const { PostState } = await import('wrdhom');
      const data = await response.json();
      const processedData = data.map( (post: any) => {
        const postStateJSON = JSON.parse(post.postState);
        const shortPosterAddressStart = postStateJSON.posterAddress.substring(0,7);
        const shortPosterAddressEnd = postStateJSON.posterAddress.slice(-7);
        const shortPosterAddress = `${shortPosterAddressStart}...${shortPosterAddressEnd}`;
        const postWitness = MerkleMapWitness.fromJSON(post.postWitness);
        const postState = PostState.fromJSON(postStateJSON);
        console.log(postWitness.computeRootAndKey(postState.hash())[0].toString());
        return {
            postState: postStateJSON,
            postContentID: post.postContentID,
            content: post.content,
            shortPosterAddress: shortPosterAddress
        }
      });
      setPosts(processedData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
    

  const handleMouseEnter = (posterAddress: string) => {
    setCopyText(posterAddress);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(copyText);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="w-1/2 p-4 overflow-y-auto max-h-[90vh]">
      {loading && <p className="border-4 p-2 shadow-lg">Loading posts...</p>}
      {error && <p className="border-4 p-2 shadow-lg">Error fetching posts: {error}</p>}
      {Array.isArray(posts) && posts.map((post) => {
        const postIdentifier = post.postState.posterAddress + post.postContentID;
        return (
            <div key={postIdentifier} className="p-2 border-b-2 shadow-lg">
                <div className="flex items-center border-4 p-2 shadow-lg text-xs text-white bg-black"
                style={{ borderBottomWidth: '2px' }}
                >
                    <p className="mr-4">{post.shortPosterAddress}</p>
                    <span 
                    className="cursor-pointer"
                    onMouseEnter={() => handleMouseEnter(post.postState.posterAddress)}
                    onClick={copyToClipboard}
                    >
                      <FontAwesomeIcon icon={faCopy}  />
                    </span>
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
