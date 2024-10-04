import { useState, useEffect } from 'react';
import { getCID } from '../utils/cid';
import { Dispatch, SetStateAction } from "react";
import { CommentState } from 'wrdhom';
import { ContentItem, ItemContentList } from './content-item';
import { FeedType } from '../types';
import { fetchItems } from './utils/fetch';

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
  commentsContractAddress,
  account,
  feedType,
  setFeedType
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
  commentsContractAddress: string,
  account: string[],
  feedType: FeedType,
  setFeedType: Dispatch<SetStateAction<FeedType>>
}) {
    const [comments, setComments] = useState([] as any[]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
    const [fetchCompleted, setFetchCompleted] = useState(false);
    const [whenZeroContent, setWhenZeroContent] = useState(false);
  
    const auditComments = async () => {
      try {
        const { MerkleMapWitness, fetchAccount, Field } = await import('o1js');
        const { CommentState } = await import('wrdhom');
        const commentsContractData = await fetchAccount({
          publicKey: commentsContractAddress
        }, '/graphql');
        const fetchedTargetsCommentsCountersRoot = commentsContractData.account?.zkapp?.appState[2].toString();
        const fetchedCommentsRoot = commentsContractData.account?.zkapp?.appState[3].toString();
  
        // Remove comment to cause a gap error
        // comments.splice(1, 1);
        
        for (let i = 0; i < comments.length; i++) {
          const commentWitness = MerkleMapWitness.fromJSON(comments[i].commentWitness);
          const commentState = CommentState.fromJSON(comments[i].commentState) as CommentState;
          let calculatedCommentsRoot = commentWitness.computeRootAndKeyV2(commentState.hash())[0].toString();

          // Introduce different root to cause a root mismatch
          /*if (i === 1) {
            calculatedCommentsRoot = 'badRoot'
          }*/

          // Audit that all roots calculated from the state of each comment and their witnesses, match zkApp state
          if (fetchedCommentsRoot !== calculatedCommentsRoot) {
            throw new Error(`Comment ${comments[i].commentState.targetCommentsCounter} has different root than zkApp state. The server may be experiencing some issues or\
            manipulating results for your query.`);
          }
  
          // Introduce different block-length to cause block mismatch
          /*if (i === 1) {
            comments[i].commentState.commentBlockHeight = 10000000000;
          }*/
  
          // Introduce different content to cause content mismatch
          /*if (i === 1) {
            comments[i].content = 'wrong content';
          }*/

          if (Number(comments[i].commentState.deletionBlockHeight) === 0) {
            // Audit that all comments are between the block range in the user query
            if (comments[i].commentState.commentBlockHeight < fromBlockComments ||  comments[i].commentState.commentBlockHeight > toBlockComments) {
              throw new Error(`Block-length ${comments[i].commentState.commentBlockHeight} for Comment ${comments[i].commentState.targetCommentsCounter} isn't between the block range\
              ${fromBlockComments} to ${toBlockComments}`);
            }
    
            // Audit that the content of comments matches the contentID signed by the author
            const cid = await getCID(comments[i].content);
            if (cid !== comments[i].commentContentID) {
              throw new Error(`The content for Comment ${comments[i].commentState.targetCommentsCounter} doesn't match the expected contentID. The server may be experiencing\
              some issues or manipulating the content it shows.`);
            }
          }
        };

      } catch (e: any) {
          console.log(e);
          setLoading(false);
          setErrorMessage(e.message);
      }
    };
  
    const auditNoMissingContent = () => {
      try {
        for (let i = 0; i < comments.length-1; i++) {
          if (Number(comments[i].commentState.targetCommentsCounter) !== Number(comments[i+1].commentState.targetCommentsCounter)+1) {
            throw new Error(`Gap between comments ${comments[i].commentState.targetCommentsCounter} and ${comments[i+1].commentState.targetCommentsCounter}.\
            The server may be experiencing some issues or censoring comments.`);
          }
        }
      } catch (e: any) {
          console.log(e);
          setLoading(false);
          setErrorMessage(e.message);
      }
    }

    const filterDeleted = () => {
      const filtered = comments.filter(comment => Number(comment.commentState.deletionBlockHeight) === 0);
      setComments(filtered);
    }

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
        setWhenZeroContent(false);

        const fetchItemsParams = {
          account: account,
          commentTarget: commentTarget,
          howManyComments: howManyComments,
          fromBlockComments: fromBlockComments,
          toBlockComments: toBlockComments,
          setComments: setComments,
          setLoading: setLoading,
          setErrorMessage: setErrorMessage
        }
        howManyComments > 0 ? await fetchItems('comments', 'Comments', fetchItemsParams) : null;

        setFetchCompleted(true);
      })();
    }, [getCommentsFeed, commentTarget]);

    useEffect(() => {
      if (!fetchCompleted) return;
      (async () => {
        if (comments.length > 0) {
          await auditComments();
          auditNoMissingContent();
          filterDeleted();
        } else {
          setWhenZeroContent(true);
        }
        setFetchCompleted(false);
        setLoading(false);
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
        {!loading && whenZeroContent && <div className="p-2 border-b-2 shadow-lg">
          <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-normal overflow-wrap">
            <p >The query threw zero results</p>
          </div>
        </div>}
      </div>
    )
}