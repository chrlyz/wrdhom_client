import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import { ItemContentList } from './content-item';
import CreatePost from '../posts/create-post';
import { fetchItems } from './utils/fetch';
import { auditItems } from './utils/audit';
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
  postsContractAddress,
  reactionsContractAddress,
  commentsContractAddress,
  repostsContractAddress,
  account,
  feedType,
  setFeedType
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
  postsContractAddress: string,
  reactionsContractAddress: string,
  commentsContractAddress: string,
  repostsContractAddress: string,
  account: string[],
  feedType: FeedType,
  setFeedType: Dispatch<SetStateAction<FeedType>>
}) {
  const [posts, setPosts] = useState([] as any[]);
  const [reposts, setReposts] = useState([] as any[]);
  const [mergedContent, setMergedContent] = useState([] as any);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
  const [fetchCompleted, setFetchCompleted] = useState(false);
  const [whenZeroContent, setWhenZeroContent] = useState(false);

  useEffect(() => {
    (async () => {
      setPosts([]);
      setReposts([]);
      setLoading(true);
      setErrorMessage(null);
      setWhenZeroContent(false);
      setFeedType('global');

      const fetchItemsParams = {
        howManyPosts: howManyPosts,
        fromBlock: fromBlock,
        toBlock: toBlock,
        howManyReposts: howManyReposts,
        fromBlockReposts: fromBlockReposts,
        toBlockReposts: toBlockReposts,
        account: account,
        setPosts: setPosts,
        setReposts: setReposts,
        setLoading: setLoading,
        setErrorMessage: setErrorMessage
      }
      howManyPosts > 0 ? await fetchItems('global', 'Posts', fetchItemsParams) : null;
      howManyReposts > 0 ? await fetchItems('global', 'Reposts', fetchItemsParams) : null;

      setFetchCompleted(true);
    })();
  }, [getGlobalFeed, account]);

  useEffect(() => {
    if (!fetchCompleted) return;
    (async () => {

      const auditGeneralParams = {
        setLoading: setLoading,
        setErrorMessage: setErrorMessage,
        postsContractAddress: postsContractAddress,
        reactionsContractAddress: reactionsContractAddress,
        commentsContractAddress: commentsContractAddress,
        repostsContractAddress: repostsContractAddress,
      }

      if (reposts.length > 0) {
        const auditRepostsParams = {
          items: reposts,
          fromBlock: fromBlockReposts,
          toBlock: toBlockReposts
        }
        await auditItems('global', 'Reposts', auditGeneralParams, auditRepostsParams);
      }

      if (posts.length === 0 && reposts.length === 0) {
        setWhenZeroContent(true);
      }

      mergeAndSortContent(posts, reposts, setMergedContent);
      setFetchCompleted(false);
      setLoading(false);
    })();
  }, [fetchCompleted]);

  return (
    <div className={`w-3/5 p-4 overflow-y-auto max-h-[100vh] ${hideGetGlobalPosts}`}>
      {loading ? null : walletConnected && <CreatePost account={account} />}
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
            <p >The query threw zero results</p>
        </div>
      </div>}
    </div>
  );
};