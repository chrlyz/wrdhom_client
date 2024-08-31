import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import ItemContentList from './content-item';
import CreatePost from '../posts/create-post';
import { fetchItems } from './utils/global-fetch';
import { auditPosts, auditReposts } from './utils/global-audit';

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
  account
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
  account: string[]
}) {
  const [posts, setPosts] = useState([] as any[]);
  const [reposts, setReposts] = useState([] as any[]);
  const [mergedContent, setMergedContent] = useState([] as any);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
  const [fetchCompleted, setFetchCompleted] = useState(false);
  const [whenZeroContent, setWhenZeroContent] = useState(false);

  const auditNoSkippingContentInPosts = () => {
    try {
      for (let i = 0; i < posts.length-1; i++) {
        if (Number(posts[i].postState.allPostsCounter) !== Number(posts[i+1].postState.allPostsCounter)+1) {
          throw new Error(`Gap between Posts ${posts[i].postState.allPostsCounter} and ${posts[i+1].postState.allPostsCounter}.\
          The server may be experiencing some issues or censoring posts.`);
        }

        for (let r = 0; r < Number(posts[i].allEmbeddedReactions.length)-1; r++) {
          if (Number(posts[i].allEmbeddedReactions[r].reactionState.targetReactionsCounter)
          !== Number(posts[i].allEmbeddedReactions[r+1].reactionState.targetReactionsCounter)+1) {
            throw new Error(`Gap between Reactions ${posts[i].allEmbeddedReactions[r].reactionState.targetReactionsCounter} and\
            ${posts[i].allEmbeddedReactions[r+1].reactionState.targetReactionsCounter}, from Post ${posts[i].postState.allPostsCounter}\
            The server may be experiencing some issues or censoring embedded reactions.`);
          }
        }

        for (let c = 0; c < Number(posts[i].embeddedComments.length)-1; c++) {
          if (Number(posts[i].embeddedComments[c].commentState.targetCommentsCounter)
          !== Number(posts[i].embeddedComments[c+1].commentState.targetCommentsCounter)+1) {
            throw new Error(`Gap between Comments ${posts[i].embeddedComments[c].commentState.targetCommentsCounter} and\
            ${posts[i].embeddedComments[c+1].commentState.targetCommentsCounter}, from Post ${posts[i].postState.allPostsCounter}\
            The server may be experiencing some issues or censoring embedded comments.`);
          }
        }

        for (let rp = 0; rp < Number(posts[i].embeddedReposts.length)-1; rp++) {
          if (Number(posts[i].embeddedReposts[rp].repostState.targetRepostsCounter)
          !== Number(posts[i].embeddedReposts[rp+1].repostState.targetRepostsCounter)+1) {
            throw new Error(`Gap between Reposts ${posts[i].embeddedReposts[rp].repostState.targetRepostsCounter} and\
            ${posts[i].embeddedReposts[rp+1].repostState.targetRepostsCounter}, from Post ${posts[i].postState.allRepostsCounter}\
            The server may be experiencing some issues or censoring embedded reposts.`);
          }
        }
      }
    } catch (e: any) {
        console.log(e);
        setLoading(false);
        setErrorMessage(e.message);
    }
  }

  const auditNoSkippingContentInReposts = () => {
    try {
      for (let i = 0; i < reposts.length-1; i++) {
        if (Number(reposts[i].repostState.allRepostsCounter) !== Number(reposts[i+1].repostState.allRepostsCounter)+1) {
          throw new Error(`Gap between Reposts ${reposts[i].repostState.allRepostsCounter} and ${reposts[i+1].repostState.allRepostsCounter}.\
          The server may be experiencing some issues or censoring reposts.`);
        }

        for (let r = 0; r < Number(reposts[i].allEmbeddedReactions.length)-1; r++) {
          if (Number(reposts[i].allEmbeddedReactions[r].reactionState.targetReactionsCounter)
          !== Number(reposts[i].allEmbeddedReactions[r+1].reactionState.targetReactionsCounter)+1) {
            throw new Error(`Gap between Reactions ${reposts[i].allEmbeddedReactions[r].reactionState.targetReactionsCounter} and\
            ${reposts[i].allEmbeddedReactions[r+1].reactionState.targetReactionsCounter} from Repost ${reposts[i].repostState.allRepostsCounter}\
            The server may be experiencing some issues or censoring embedded reactions.`);
          }
        }

        for (let c = 0; c < Number(reposts[i].embeddedComments.length)-1; c++) {
          if (Number(reposts[i].embeddedComments[c].commentState.targetCommentsCounter)
          !== Number(reposts[i].embeddedComments[c+1].commentState.targetCommentsCounter)+1) {
            throw new Error(`Gap between Comments ${reposts[i].embeddedComments[c].commentState.targetCommentsCounter} and\
            ${reposts[i].embeddedComments[c+1].commentState.targetCommentsCounter}, from Repost ${reposts[i].repostState.allRepostsCounter}\
            The server may be experiencing some issues or censoring embedded comments.`);
          }
        }

        for (let rp = 0; rp < Number(reposts[i].embeddedReposts.length)-1; rp++) {
          if (Number(reposts[i].embeddedReposts[rp].repostState.targetRepostsCounter)
          !== Number(reposts[i].embeddedReposts[rp+1].repostState.targetRepostsCounter)+1) {
            throw new Error(`Gap between Reposts ${reposts[i].embeddedReposts[rp].repostState.targetRepostsCounter} and\
            ${reposts[i].embeddedReposts[rp+1].repostState.targetRepostsCounter}, from Repost ${reposts[i].repostState.allRepostsCounter}\
            The server may be experiencing some issues or censoring embedded reposts.`);
          }
        }
      }
    } catch (e: any) {
        console.log(e);
        setLoading(false);
        setErrorMessage(e.message);
    }
  }

  const mergeAndSortContent = () => {
    const merged = [...posts, ...reposts];
    const filteredByDeletedPosts = merged.filter(element => Number(element.postState.deletionBlockHeight) === 0);
    const filteredByDeletedReposts = filteredByDeletedPosts.filter(element => element.repostState === undefined ?
                                                              true : Number(element.repostState.deletionBlockHeight) === 0);
    const sorted = filteredByDeletedReposts.sort((a,b) => {
        const blockHeightA =  a.repostState === undefined ? a.postState.postBlockHeight : a.repostState.repostBlockHeight;
        const blockHeightB =  b.repostState === undefined ? b.postState.postBlockHeight : b.repostState.repostBlockHeight;
        return blockHeightB - blockHeightA;
    });
    setMergedContent(sorted);
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
      howManyPosts > 0 ? await fetchItems('Posts', fetchItemsParams) : null;
      howManyReposts > 0 ? await fetchItems('Reposts', fetchItemsParams) : null;

      setFetchCompleted(true);
    })();
  }, [getGlobalFeed]);

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
        await auditPosts(auditGeneralParams, auditPostsParams);
        auditNoSkippingContentInPosts();
      }

      if (reposts.length > 0) {
        const auditRepostsParams = {
          reposts: reposts,
          fromBlockReposts: fromBlockReposts,
          toBlockReposts: toBlockReposts
        }
        await auditReposts(auditGeneralParams, auditRepostsParams);
        auditNoSkippingContentInReposts();
      }

      if (posts.length === 0 && reposts.length === 0) {
        setWhenZeroContent(true);
      }

      mergeAndSortContent();
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
        feedType='global'
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