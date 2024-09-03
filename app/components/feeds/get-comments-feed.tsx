import { useState, useEffect } from 'react';
import { getCID } from '../utils/cid';
import { Dispatch, SetStateAction } from "react";
import ReactionButton from '../reactions/reaction-button';
import CommentButton from '../comments/comment-button';
import RepostButton from '../reposts/repost-button';
import DeleteCommentButton from '../comments/delete-comment-button';
import { faComments, faRetweet } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CommentState } from 'wrdhom';
import DeleteRepostButton from '../reposts/delete-repost-button';
import DeleteButton from '../posts/delete-post-button';

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
  account
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
  account: string[]
}) {
    const [comments, setComments] = useState([] as any[]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
    const [fetchCompleted, setFetchCompleted] = useState(false);
    const [whenZeroContent, setWhenZeroContent] = useState(false);

    const fetchComments = async () => {
      try {
        const response = await fetch(`/comments`+
            `?targetKey=${commentTarget.postKey}`+
            `&howMany=${howManyComments}`+
            `&fromBlock=${fromBlockComments}`+
            `&toBlock=${toBlockComments}`,
          {
            headers: {'Cache-Control': 'no-cache'}
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: any = await response.json();
        if (data.commentsResponse.length === 0) {
          return;
        }
  
        const processedData: {
          commentState: JSON,
          commentWitness: JSON,
          commentKey: string,
          commentContentID: string,
          content: string,
          shortCommenterAddressEnd: string,
        }[] = [];
        
        for (let i = 0; i < data.commentsResponse.length; i++) {
          const commentStateJSON = JSON.parse(data.commentsResponse[i].commentState);
          const shortCommenterAddressEnd = commentStateJSON.commenterAddress.slice(-12);
  
          processedData.push({
              commentState: commentStateJSON,
              commentWitness: JSON.parse(data.commentsResponse[i].commentWitness),
              commentKey: data.commentsResponse[i].commentKey,
              commentContentID: data.commentsResponse[i].commentContentID,
              content: data.commentsResponse[i].content,
              shortCommenterAddressEnd: shortCommenterAddressEnd
          });
        };
  
        setComments(processedData);

      } catch (e: any) {
          console.log(e);
          setLoading(false);
          setErrorMessage(e.message);
      }
    };
  
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
    }
  
    useEffect(() => {
      (async () => {
        setComments([]);
        setLoading(true);
        setErrorMessage(null);
        setWhenZeroContent(false);
        howManyComments > 0 ? await fetchComments() : null;
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
                <div key={commentTarget.postKey} className="p-2 border-b-2 shadow-lg">
                    <div className="flex items-center border-4 p-2 shadow-lg text-xs text-white bg-black">
                    <span 
                        className="mr-2 cursor-pointer hover:underline"
                        onMouseEnter={() => setSelectedProfileAddress(commentTarget.postState.posterAddress)}
                        onClick={() => setProfileAddress(selectedProfileAddress)}
                        >
                        <p className="mr-8">{commentTarget.shortPosterAddressEnd}</p>
                        </span>
                        <p className="mr-4">{'Post:' + commentTarget.postState.allPostsCounter}</p>
                        <div className="flex-grow"></div>
                         <p className="mr-1">{'Block:' + commentTarget.postState.postBlockHeight}</p>
                    </div>
                    <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-all">
                        <p>{commentTarget.content}</p>
                    </div>
                    <div className="flex flex-row">
                      {commentTarget.top3Emojis.map((emoji: string) => emoji)}
                      <p className="text-xs ml-1 mt-2">{commentTarget.numberOfReactions > 0 ? commentTarget.numberOfReactions : null}</p>
                      {commentTarget.numberOfNonDeletedComments > 0 ?
                      <FontAwesomeIcon className="ml-3 mt-1" icon={faComments} /> : null}
                      <p className="text-xs ml-1 mt-2">{commentTarget.numberOfNonDeletedComments > 0 ? commentTarget.numberOfNonDeletedComments : null}</p>
                      {commentTarget.numberOfNonDeletedReposts > 0 ? <div className="ml-3"><FontAwesomeIcon icon={faRetweet} /></div> : null}
                      <p className="text-xs ml-1 mt-2">{commentTarget.numberOfNonDeletedReposts > 0 ? commentTarget.numberOfNonDeletedReposts : null}</p>
                      <div className="flex-grow"></div>
                      {walletConnected && <ReactionButton
                        targetKey={commentTarget.postKey}
                        embeddedReactions={commentTarget.embeddedReactions}
                        account={account[0]}
                      />}
                      {walletConnected && <CommentButton
                        targetKey={commentTarget.postKey}
                      />}
                      {
                        commentTarget.repostState !== undefined &&
                        commentTarget.repostState.reposterAddress !== undefined &&
                        account[0] === commentTarget.repostState.reposterAddress
                        ?
                          <DeleteRepostButton
                            repostTargetKey={commentTarget.postKey}
                            repostState={commentTarget.repostState}
                            repostKey={commentTarget.repostKey}
                          />
                        :
                          commentTarget.currentUserRepostState !== undefined &&
                          commentTarget.currentUserRepostState.reposterAddress !== undefined &&
                          account[0] === commentTarget.currentUserRepostState.reposterAddress
                        ?
                          <DeleteRepostButton
                            repostTargetKey={commentTarget.postKey}
                            repostState={commentTarget.currentUserRepostState}
                            repostKey={commentTarget.currentUserRepostKey}
                          />
                        :
                        walletConnected && <RepostButton targetKey={commentTarget.postKey}/>
                      }
                      {account[0] === commentTarget.postState.posterAddress ?
                        <DeleteButton
                          postState={commentTarget.postState}
                          postKey={commentTarget.postKey}  
                          />
                          : null
                      }
                    </div>
             </div>
            </div>
            {loading && <p className="border-4 p-2 shadow-lg">Loading comments...</p>}
            {errorMessage && <p className="border-4 p-2 shadow-lg">Error: {errorMessage}</p>}
            {!loading && Array.isArray(comments) && comments.map((comment) => {
                return (
                    <div key={comment.commentKey} className="p-2 border-b-2 shadow-lg">
                        <div className="flex items-center border-4 p-2 shadow-lg text-xs text-white bg-black">
                          <span 
                              className="mr-2 cursor-pointer hover:underline"
                              onMouseEnter={() => setSelectedProfileAddress(comment.commentState.commenterAddress)}
                              onClick={() => setProfileAddress(selectedProfileAddress)}
                              >
                              <p className="mr-8">{comment.shortCommenterAddressEnd}</p>
                          </span>
                          <p className="mr-4">{'Comment:' + comment.commentState.targetCommentsCounter}</p>
                          <div className="flex-grow"></div>
                          <p className="mr-1">{'Block:' + comment.commentState.commentBlockHeight}</p>
                        </div>
                        <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-all">
                            <p>{comment.content}</p>
                        </div>
                        <div className="flex flex-row">
                        <div className="flex-grow"></div>
                          {
                            account[0] === comment.commentState.commenterAddress ?
                              <DeleteCommentButton
                                commentTarget={commentTarget}
                                commentState={comment.commentState}
                                commentKey={comment.commentKey}  
                              />
                            : null
                          }
                        </div>
                    </div>
                );
            })}
            {!loading && whenZeroContent && <div className="p-2 border-b-2 shadow-lg">
              <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-normal overflow-wrap">
                <p >The query threw zero results</p>
              </div>
            </div>}
        </div>
    )
}