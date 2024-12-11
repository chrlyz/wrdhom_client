import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import { ItemContentList } from './content-item';
import CreatePost from '../posts/create-post';
import { fetchItems } from './utils/fetch';
import { mergeAndSortContent } from './utils/mergeContent';
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
  queries,
  setQueries,
  isDBLoaded,
  setIsDBLoaded,
  pastQuery,
  setPastQuery,
  setCurrentQuery,
  currentQuery,
  posts,
  setPosts,
  loading,
  setLoading,
  errorMessage,
  setErrorMessage,
  setMergedContent,
  mergedContent
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
  queries: any[],
  setQueries: Dispatch<SetStateAction<any[]>>,
  isDBLoaded: boolean,
  setIsDBLoaded: Dispatch<SetStateAction<boolean>>,
  pastQuery: any,
  setPastQuery: Dispatch<SetStateAction<any>>,
  setCurrentQuery: Dispatch<SetStateAction<any>>,
  currentQuery: any,
  posts: any[],
  setPosts: Dispatch<SetStateAction<any[]>>,
  loading: boolean,
  setLoading: Dispatch<SetStateAction<boolean>>,
  errorMessage: any,
  setErrorMessage: Dispatch<SetStateAction<any>>,
  setMergedContent: Dispatch<SetStateAction<any[]>>,
  mergedContent: any[]
}) {
  const [reposts, setReposts] = useState([] as any[]);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
  const [fetchCompleted, setFetchCompleted] = useState(false);

  useEffect(() => {
    (async () => {
      setFetchCompleted(false);
      setPosts([]);
      setReposts([]);
      setLoading(true);
      setErrorMessage(null);
      setFeedType('global');

      const fetchItemsParams = {
        account,
        setLoading,
        setErrorMessage,
        queries,
        setQueries,
        isDBLoaded,
        setIsDBLoaded,
        pastQuery,
        setPastQuery,
        setCurrentQuery,
        currentQuery,
        howManyPosts,
        fromBlock,
        toBlock,
        setPosts,
        howManyReposts,
        fromBlockReposts,
        toBlockReposts,
        setReposts: setReposts
      }

      let fetchedPosts = {posts: {processedItems: []}}
      let fetchedReposts = {reposts: {processedItems: []}};
      if (howManyPosts > 0) {
        fetchedPosts = await fetchItems('global', 'Posts', fetchItemsParams);
      }

      if (howManyReposts > 0) {
        fetchedReposts = await fetchItems('global', 'Reposts', fetchItemsParams);
      }
      setCurrentQuery({...fetchedPosts, ...fetchedReposts, feedType: 'global'});

      setFetchCompleted(true);
    })();
  }, [getGlobalFeed, account, isDBLoaded]);

  useEffect(() => {
    (async () => {
      if (fetchCompleted) {
        mergeAndSortContent(
          setCurrentQuery,
          currentQuery,
          setQueries,
          queries,
          setPastQuery,
          pastQuery,
          setIsDBLoaded,
          isDBLoaded,
          setMergedContent
        );
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
      {!loading && currentQuery.posts.processedItems.length === 0 && currentQuery.reposts.processedItems.length === 0 && <div className="p-2 border-b-2 shadow-lg">
        <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-normal overflow-wrap">
            <p >The query threw zero results (global)</p>
        </div>
      </div>}
    </div>
  );
};