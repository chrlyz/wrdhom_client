import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import ItemContentList from './content-item';
import { fetchItems } from './utils/fetch';
import { auditPosts, auditReposts } from './utils/audit';
import { mergeAndSortContent } from './utils/structure';

export default function GetProfileFeed({
  getProfileFeed,
  profileAddress,
  setProfileAddress,
  howManyPosts,
  fromBlock,
  toBlock,
  setShowProfile,
  setHideGetGlobalPosts,
  walletConnected,
  setCommentTarget,
  howManyReposts,
  fromBlockReposts,
  toBlockReposts,
  postsContractAddress,
  reactionsContractAddress,
  commentsContractAddress,
  repostsContractAddress,
  account
}: {
  getProfileFeed: boolean,
  profileAddress: string,
  setProfileAddress: Dispatch<SetStateAction<string>>,
  howManyPosts: number,
  fromBlock: number,
  toBlock: number,
  setShowProfile: Dispatch<SetStateAction<boolean>>,
  setHideGetGlobalPosts: Dispatch<SetStateAction<string>>,
  walletConnected: boolean,
  setCommentTarget: Dispatch<SetStateAction<any>>,
  howManyReposts: number,
  fromBlockReposts: number,
  toBlockReposts: number,
  postsContractAddress: string,
  reactionsContractAddress: string,
  commentsContractAddress: string,
  repostsContractAddress: string,
  account: string[]
}) {
  const [posts, setPosts] = useState([] as any[]);
  const [reposts, setReposts] = useState([] as any[]);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
  const [mergedContent, setMergedContent] = useState([] as any);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [fetchCompleted, setFetchCompleted] = useState(false);
  const [whenZeroContent, setWhenZeroContent] = useState(false);


  const goBack = () => {
    setShowProfile(false);
    setProfileAddress('');
    setCommentTarget(null);
    setHideGetGlobalPosts('');
  }

  useEffect(() => {
    (async () => {
      setPosts([]);
      setReposts([]);
      setLoading(true);
      setErrorMessage(null);
      setWhenZeroContent(false);

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
      howManyPosts > 0 ? await fetchItems('profile', 'Posts', fetchItemsParams, profileAddress) : null;
      howManyReposts > 0 ? await fetchItems('profile', 'Reposts', fetchItemsParams, profileAddress) : null;

      setFetchCompleted(true);
    })();
  }, [getProfileFeed, profileAddress]);

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

      if (posts.length > 0) {
        const auditPostsParams = {
          posts: posts,
          fromBlock: fromBlock,
          toBlock: toBlock,
        }
        await auditPosts('profile', auditGeneralParams, auditPostsParams);
      }
      if (reposts.length > 0) {
        const auditRepostsParams = {
          reposts: reposts,
          fromBlockReposts: fromBlockReposts,
          toBlockReposts: toBlockReposts
        }
        await auditReposts('profile', auditGeneralParams, auditRepostsParams);
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
    <div className={`w-3/5 p-4 overflow-y-auto max-h-[100vh]`}>
      <div className="p-2 border-b-2 shadow-lg">
        <button className="hover:underline m-2" onClick={goBack}>{'<- Go back to feed'}</button>
        <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap">
            <p >{`Posts from user:\n\n${profileAddress}`}</p>
        </div>
      </div>
      {loading && <p className="border-4 p-2 shadow-lg">Loading...</p>}
      {errorMessage && <p className="border-4 p-2 shadow-lg break-normal overflow-wrap">Error: {errorMessage}</p>}
      <ItemContentList
        feedType='profile'
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