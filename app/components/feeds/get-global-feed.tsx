import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import { ItemContentList } from './content-item';
import CreatePost from '../posts/create-post';
import { fetchItems } from './utils/fetch';
import { mergeAndSortContent } from './utils/structure';
import { FeedType } from '../types';

export default function GetGlobalFeed({
  getGlobalFeed,
  howManyPosts,
  fromBlock,
  toBlock,
  setProfileAddress,
  hideGetGlobalPosts,
  walletConnected,
  setCommentTarget,
  howManyReposts,
  fromBlockReposts,
  toBlockReposts,
  account,
  feedType,
  setFeedType,
  postsQueries,
  setPostsQueries,
  isDBLoaded,
  setIsDBLoaded,
  pastPostsQuery,
  setPastPostsQuery,
  setCurrentPostsQuery,
  posts,
  setPosts,
  loading,
  setLoading,
  errorMessage,
  setErrorMessage
}: {
  getGlobalFeed: boolean,
  howManyPosts: number,
  fromBlock: number,
  toBlock: number,
  setProfileAddress: Dispatch<SetStateAction<string>>,
  hideGetGlobalPosts: string,
  walletConnected: boolean,
  setCommentTarget: Dispatch<SetStateAction<any>>,
  howManyReposts: number,
  fromBlockReposts: number,
  toBlockReposts: number,
  account: string[],
  feedType: FeedType,
  setFeedType: Dispatch<SetStateAction<FeedType>>,
  postsQueries: any[],
  setPostsQueries: Dispatch<SetStateAction<any[]>>,
  isDBLoaded: boolean,
  setIsDBLoaded: Dispatch<SetStateAction<boolean>>,
  pastPostsQuery: any,
  setPastPostsQuery: Dispatch<SetStateAction<any>>,
  setCurrentPostsQuery: Dispatch<SetStateAction<any>>,
  posts: any[],
  setPosts: Dispatch<SetStateAction<any[]>>,
  loading: boolean,
  setLoading: Dispatch<SetStateAction<boolean>>,
  errorMessage: any,
  setErrorMessage: Dispatch<SetStateAction<any>>
}) {
  const [reposts, setReposts] = useState([] as any[]);
  const [mergedContent, setMergedContent] = useState([] as any);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
  const [fetchCompleted, setFetchCompleted] = useState(false);
  const [whenZeroContent, setWhenZeroContent] = useState(false);

  useEffect(() => {
    (async () => {
      setFetchCompleted(false);
      setPosts([]);
      setReposts([]);
      setLoading(true);
      setErrorMessage(null);
      setWhenZeroContent(false);
      setFeedType('global');

      const fetchItemsParams = {
        account,
        setLoading,
        setErrorMessage,
        postsQueries,
        setPostsQueries,
        isDBLoaded,
        setIsDBLoaded,
        pastPostsQuery,
        setPastPostsQuery,
        setCurrentPostsQuery,
        howManyPosts,
        fromBlock,
        toBlock,
        setPosts,
        howManyReposts,
        fromBlockReposts,
        toBlockReposts,
        setReposts: setReposts
      }
      howManyPosts > 0 ? await fetchItems('global', 'Posts', fetchItemsParams) : null;
      howManyReposts > 0 ? await fetchItems('global', 'Reposts', fetchItemsParams) : null;

      setFetchCompleted(true);
    })();
  }, [getGlobalFeed, account, isDBLoaded]);

  useEffect(() => {
    (async () => {
      if (fetchCompleted) {
        if (posts.length === 0 && reposts.length === 0) {
          setWhenZeroContent(true);
        }
  
        mergeAndSortContent(posts, reposts, setMergedContent);
        setLoading(false);
      }
    })();
  }, [fetchCompleted, posts]);

  return (
    <div className={`w-3/5 p-4 overflow-y-auto max-h-[100vh] ${hideGetGlobalPosts}`}>
      {loading ? null : walletConnected && <CreatePost/>}
      {loading && <p className="border-4 p-2 shadow-lg">Loading...</p>}
      {errorMessage && <p className="border-4 p-2 shadow-lg break-normal overflow-wrap">Error: {errorMessage}</p>}
      <ItemContentList
        feedType={feedType}
        mergedContent={mergedContent}
        loading={loading}
        walletConnected={walletConnected}
        account={account}
        setSelectedProfileAddress={setSelectedProfileAddress}
        selectedProfileAddress={selectedProfileAddress}
        setProfileAddress={setProfileAddress}
        setCommentTarget={setCommentTarget}
      />
      {!loading && whenZeroContent && <div className="p-2 border-b-2 shadow-lg">
        <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-normal overflow-wrap">
            <p >The query threw zero results (global)</p>
        </div>
      </div>}
    </div>
  );
};