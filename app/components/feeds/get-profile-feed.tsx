import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import { ItemContentList } from './content-item';
import { fetchItems } from './utils/fetch';
import { indexPostsAndReposts } from './utils/indexPostsAndReposts';
import { FeedType } from '../types';

export default function GetProfileFeed({
  getProfileFeed,
  profileAddress,
  setProfileAddress,
  howManyPosts,
  fromBlock,
  toBlock,
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
  loading,
  setLoading,
  errorMessage,
  setErrorMessage,
  setMergedContent,
  mergedContent
}: {
  getProfileFeed: boolean,
  profileAddress: string,
  setProfileAddress: Dispatch<SetStateAction<string>>,
  howManyPosts: number,
  fromBlock: number,
  toBlock: number,
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
  loading: boolean,
  setLoading: Dispatch<SetStateAction<boolean>>,
  errorMessage: any,
  setErrorMessage: Dispatch<SetStateAction<any>>,
  setMergedContent: Dispatch<SetStateAction<any[]>>,
  mergedContent: any[]
}) {

  const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
  const [fetchCompleted, setFetchCompleted] = useState(false);

  useEffect(() => {
    (async () => {
      setFetchCompleted(false);
      setLoading(true);
      setErrorMessage(null);
      setFeedType('profile');

      const fetchItemsParams = {
        account,
        profileAddress,
        setLoading,
        setErrorMessage,
        howManyPosts,
        fromBlock,
        toBlock,
        howManyReposts,
        fromBlockReposts,
        toBlockReposts
      }

      let fetchedPosts = {posts: {processedItems: []}}
      let fetchedReposts = {reposts: {processedItems: []}}
      let fetchedComments = {comments: {processedItems: []}}
      if (howManyPosts > 0) {
        fetchedPosts = await fetchItems('profile', 'Posts', fetchItemsParams);
        fetchedPosts = fetchedPosts ?? {posts: {processedItems: []}}
      }

      if (howManyReposts > 0) {
        fetchedReposts = await fetchItems('profile', 'Reposts', fetchItemsParams);
        fetchedReposts = fetchedReposts ?? {reposts: {processedItems: []}}
      }

      setCurrentQuery({...fetchedPosts, ...fetchedReposts, ...fetchedComments, feedType: 'profile', profileAddress: profileAddress});

      setFetchCompleted(true);
    })();
  }, [getProfileFeed, isDBLoaded, profileAddress]);

  useEffect(() => {
    (async () => {
      if (fetchCompleted) {
        indexPostsAndReposts(
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
  }, [fetchCompleted]);

  return (
    <div className={`w-3/5 p-4 overflow-y-auto max-h-[100vh]`}>
      <div className="p-2 border-b-2 shadow-lg">
        <div className="flex items-center border-4 p-2 shadow-lg break-all whitespace-pre-line">
            <p >{`Posts from user:\n\n${profileAddress}`}</p>
        </div>
      </div>
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
            <p >Empty Feed</p>
        </div>
      </div>}
    </div>
  );
};