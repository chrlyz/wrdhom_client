import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import { ContentItem, ItemContentList } from './content-item';
import { FeedType } from '../types';
import { fetchItems } from './utils/fetch';
import { auditItems } from './../audit/utils/audit';

export default function GetCommentsFeed({
  commentTarget,
  setProfileAddress,
  howManyComments,
  fromBlockComments,
  toBlockComments,
  getCommentsFeed,
  walletConnected,
  setCommentTarget,
  setHideGetGlobalPosts,
  setShowComments,
  postsContractAddress,
  reactionsContractAddress,
  commentsContractAddress,
  repostsContractAddress,
  account,
  feedType,
  setFeedType,
  postsQueries,
  setPostsQueries,
  isDBLoaded,
  setIsDBLoaded,
  pastPostsQuery,
  setPastPostsQuery,
  setCurrentPostsQuery
}: {
  commentTarget: any,
  setProfileAddress: Dispatch<SetStateAction<string>>,
  howManyComments: number,
  fromBlockComments: number,
  toBlockComments: number,
  getCommentsFeed: boolean,
  walletConnected: boolean,
  setCommentTarget: Dispatch<SetStateAction<any>>,
  setHideGetGlobalPosts: Dispatch<SetStateAction<string>>,
  setShowComments: Dispatch<SetStateAction<boolean>>,
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
  pastPostsQuery: any,
  setPastPostsQuery: Dispatch<SetStateAction<any>>,
  setCurrentPostsQuery: Dispatch<SetStateAction<any>>
}) {
    const [comments, setComments] = useState([] as any[]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
    const [fetchCompleted, setFetchCompleted] = useState(false);
  
    const goBack = () => {
        setShowComments(false);
        setCommentTarget(null);
        setProfileAddress('');
        setHideGetGlobalPosts('');
        setFeedType('global');
    }
  
    useEffect(() => {
      (async () => {
        setComments([]);
        setLoading(true);
        setErrorMessage(null);

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
          commentTarget,
          howManyComments,
          fromBlockComments,
          toBlockComments,
          setComments
        }
        howManyComments > 0 ? await fetchItems('comments', 'Comments', fetchItemsParams) : null;

        setFetchCompleted(true);
      })();
    }, [getCommentsFeed, commentTarget]);

    useEffect(() => {
      (async () => {
        if (fetchCompleted) {
          setFetchCompleted(false);
          setLoading(false);
        }
      })();
    }, [fetchCompleted]);

    return (
      <div className={`w-3/5 p-4 overflow-y-auto max-h-[100vh]`}>
        <div className="p-2 border-b-2 shadow-lg">
          <button className="hover:underline m-2" onClick={goBack}>{'<- Go back to feed'}</button>
          <ContentItem
            feedType={feedType}
            item={commentTarget}
            walletConnected={walletConnected}
            account={account}
            setSelectedProfileAddress={setSelectedProfileAddress}
            selectedProfileAddress={selectedProfileAddress}
            setProfileAddress={setProfileAddress}
            setCommentTarget={setCommentTarget}
          />
        </div>
        {loading && <p className="border-4 p-2 shadow-lg">Loading comments...</p>}
        {errorMessage && <p className="border-4 p-2 shadow-lg">Error: {errorMessage}</p>}
        <ItemContentList
          feedType={feedType}
          mergedContent={comments}
          loading={loading}
          walletConnected={walletConnected}
          account={account}
          setSelectedProfileAddress={setSelectedProfileAddress}
          selectedProfileAddress={selectedProfileAddress}
          setProfileAddress={setProfileAddress}
          setCommentTarget={setCommentTarget}
          commentTarget={commentTarget}
        />
        {!loading && comments.length === 0 && <div className="p-2 border-b-2 shadow-lg">
          <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-normal overflow-wrap">
            <p >The query threw zero results</p>
          </div>
        </div>}
      </div>
    )
}