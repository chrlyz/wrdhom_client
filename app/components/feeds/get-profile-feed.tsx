import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import { ItemContentList } from './content-item';
import { fetchItems } from './utils/fetch';
import { mergeAndSortContent } from './utils/structure';
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
  postsQueries,
  setPostsQueries,
  isDBLoaded,
  setIsDBLoaded,
  initialPostsQuery,
  setInitialPostsQuery,
  setCurrentPostsQuery,
  posts,
  setPosts
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
  postsContractAddress: string,
  reactionsContractAddress: string,
  commentsContractAddress: string,
  repostsContractAddress: string,
  account: string[],
  feedType: FeedType,
  setFeedType: Dispatch<SetStateAction<FeedType>>,
  postsQueries: any[],
  setPostsQueries: Dispatch<SetStateAction<any[]>>,
  isDBLoaded: boolean,
  setIsDBLoaded: Dispatch<SetStateAction<boolean>>,
  initialPostsQuery: any,
  setInitialPostsQuery: Dispatch<SetStateAction<any>>,
  setCurrentPostsQuery: Dispatch<SetStateAction<any>>,
  posts: any[],
  setPosts: Dispatch<SetStateAction<any[]>>
}) {

  const [reposts, setReposts] = useState([] as any[]);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
  const [mergedContent, setMergedContent] = useState([] as any);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
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
      setFeedType('profile');

      const fetchItemsParams = {
        account,
        profileAddress,
        setLoading,
        setErrorMessage,
        postsQueries,
        setPostsQueries,
        isDBLoaded,
        setIsDBLoaded,
        initialPostsQuery,
        setInitialPostsQuery,
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
      howManyPosts > 0 ? await fetchItems('profile', 'Posts', fetchItemsParams) : null;
      howManyReposts > 0 ? await fetchItems('profile', 'Reposts', fetchItemsParams) : null;

      setFetchCompleted(true);
    })();
  }, [getProfileFeed, account]);

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
    <div className={`w-3/5 p-4 overflow-y-auto max-h-[100vh]`}>
      <div className="p-2 border-b-2 shadow-lg">
        <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap">
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
      {!loading && whenZeroContent && <div className="p-2 border-b-2 shadow-lg">
        <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-normal overflow-wrap">
            <p >The query threw zero results (profile)</p>
        </div>
      </div>}
    </div>
  );
};