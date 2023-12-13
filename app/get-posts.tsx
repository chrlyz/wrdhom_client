import React, { useState, useEffect } from 'react';

export default function GetPosts() {
  const [posts, setPosts] = useState([] as any[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/posts?howMany=3');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPosts(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  console.log(posts);

  // Render posts, loading state, or error message
  return (
    <div className="w-1/2 p-4 overflow-y-auto max-h-[90vh]">
      {loading && <p>Loading posts...</p>}
      {error && <p>Error fetching posts: {error}</p>}
      {Array.isArray(posts) && posts.map((post) => (
        <div key={post.posterAddress} className="p-2 border-b-2">
          <p>{post.posterAddress}</p>
          <p>{post.content}</p>
        </div>
      ))}
    </div>
  );
};
