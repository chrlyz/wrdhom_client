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
      const response = await fetch('/posts?howMany=4');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const processedData = data.map( (obj: any) => {
        const shortPosterAddressStart = obj.posterAddress.substring(0,7);
        const shortPosterAddressEnd = obj.posterAddress.slice(-7);
        const shortPosterAddress = `${shortPosterAddressStart}...${shortPosterAddressEnd}`;
        return {
            ...obj,
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
        const postIdentifier = post.posterAddress + post.postContentID;
        return (
            <div key={postIdentifier} className="p-2 border-b-2 shadow-lg">
                <div className="flex items-center border-4 p-2 shadow-lg text-xs" style={{ borderBottomWidth: '2px' }}>
                    <p className="mr-4">{post.shortPosterAddress}</p>
                    <span 
                        className="cursor-pointer"
                        onMouseEnter={() => handleMouseEnter(post.posterAddress)}
                        onClick={copyToClipboard}
                    >
                        <FontAwesomeIcon icon={faCopy}  />
                    </span>
                </div>
                <div className="flex items-center border-4 p-2 shadow-lg">
                    <p>{post.content}</p>
                </div>
            </div>
        );
      })}
    </div>
  );
};
