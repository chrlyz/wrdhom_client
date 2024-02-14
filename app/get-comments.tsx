import { useState, useEffect } from 'react';
import { getCID } from './utils/cid';
import { Dispatch, SetStateAction } from "react";
import ReactionButton from './reaction-button';
import CommentButton from './comment-button';
import RepostButton from './repost-button';

export default function GetComments({
  commentTarget,
  setProfileAddress,
  howManyComments,
  fromBlockComments,
  toBlockComments,
  getComments,
  walletConnected,
  setCommentTarget,
  setHideGetPosts,
  setShowComments
}: {
  commentTarget: any,
  setProfileAddress: Dispatch<SetStateAction<string>>,
  howManyComments: number,
  fromBlockComments: number,
  toBlockComments: number,
  getComments: boolean,
  walletConnected: boolean,
  setCommentTarget: Dispatch<SetStateAction<any>>,
  setHideGetPosts: Dispatch<SetStateAction<string>>,
  setShowComments: Dispatch<SetStateAction<boolean>>
}) {
    const [comments, setComments] = useState([] as any[]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const [warningMessage, setWarningMessage] = useState(null);
    const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
    const [triggerAudit, setTriggerAudit] = useState(false);
  
    const fetchComments = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        setWarningMessage(null);
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
        const { MerkleMapWitness, fetchAccount, Field } = await import('o1js');
        const { CommentState } = await import('wrdhom');
        const commentsContractData = await fetchAccount({
          publicKey: 'B62qmEfk2AC677Y8J7GJUHRjA1CAsVyrcfuipVu4zc6wrPyHdz2PQFY'
        }, '/graphql');
        const fetchedTargetsCommentsCountersRoot = commentsContractData.account?.zkapp?.appState[2].toString();
        console.log('fetchedTargetsCommentsCountersRoot: ' + fetchedTargetsCommentsCountersRoot);
        const fetchedCommentsRoot = commentsContractData.account?.zkapp?.appState[3].toString();
        console.log('fetchedCommentsRoot: ' + fetchedCommentsRoot);

        const numberOfCommentsWitness = MerkleMapWitness.fromJSON(data.numberOfCommentsWitness);
        let calculatedTargetsCommentsCountersRoot = numberOfCommentsWitness.computeRootAndKey(
          Field(data.numberOfComments))[0].toString();
        console.log('calculatedTargetsCommentsCountersRoot: ' + calculatedTargetsCommentsCountersRoot);
  
        if (fetchedTargetsCommentsCountersRoot !== calculatedTargetsCommentsCountersRoot) {
          throw new Error(`The server stated that there are ${data.numberOfComments} comments for post ${commentTarget.postState.allPostsCounter},\
          but the contract accounts for a different amount. The server may be experiencing issues or manipulating responses.`);
        }
  
        // Remove comment to cause a gap error
        //data.commentsResponse.splice(2, 1);
  
        const processedData: {
          commentState: JSON,
          commentKey: string,
          commentContentID: string,
          content: string,
          shortCommenterAddressEnd: string,
          commentsRoot: string
        }[] = [];
        
        for (let i = 0; i < data.commentsResponse.length; i++) {
          const commentStateJSON = JSON.parse(data.commentsResponse[i].commentState);
          const shortCommenterAddressEnd = commentStateJSON.commenterAddress.slice(-12);
          const commentWitness = MerkleMapWitness.fromJSON(data.commentsResponse[i].commentWitness);
          const commentState = CommentState.fromJSON(commentStateJSON);
          let calculatedCommentsRoot = commentWitness.computeRootAndKey(commentState.hash())[0].toString();
          console.log('calculatedCommentsRoot: ' + calculatedCommentsRoot);
  
          // Introduce different root to cause a root mismatch
          /*if (index === 0) {
            calculatedPostsRoot = 'badRoot'
          }*/
  
          // Introduce different block-length to cause block mismatch
          /*if (index === 2) {
            postStateJSON.postBlockHeight = 10000000000;
          }*/
  
          // Introduce different content to cause content mismatch
          /*if (i === 0) {
            data.commentsResponse[i].content = 'wrong content';
          }*/
  
          // Audit that all comments are between the block range in the user query
          if (commentStateJSON.commentBlockHeight < fromBlockComments ||  commentStateJSON.commentBlockHeight > toBlockComments) {
            throw new Error(`Block-length ${commentStateJSON.commentBlockHeight} for Comment ${commentStateJSON.targetCommentsCounter} isn't between the block range\
            ${fromBlockComments} to ${toBlockComments}`);
          }
  
          // Audit that all roots calculated from the state of each comment and their witnesses, match zkApp state
          if (fetchedCommentsRoot !== calculatedCommentsRoot) {
            throw new Error(`Comment ${commentStateJSON.targetCommentsCounter} has different root than zkApp state. The server may be experiencing some issues or\
            manipulating results for your query.`);
          }    
  
          // Audit that the content of comments matches the contentID signed by the author
          const cid = await getCID(data.commentsResponse[i].content);
          if (cid !== data.commentsResponse[i].commentContentID) {
            throw new Error(`The content for Comment ${commentStateJSON.targetCommentsCounter} doesn't match the expected contentID. The server may be experiencing\
            some issues or manipulating the content it shows.`);
          }
  
          processedData.push({
              commentState: commentStateJSON,
              commentKey: data.commentsResponse[i].commentKey,
              commentContentID: data.commentsResponse[i].commentContentID,
              content: data.commentsResponse[i].content,
              shortCommenterAddressEnd: shortCommenterAddressEnd,
              commentsRoot: calculatedCommentsRoot
          });
        };
  
        setComments(processedData);

      } catch (e: any) {
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
        setLoading(false);
      } catch (e: any) {
          setLoading(false);
          setErrorMessage(e.message);
      }
    }

    const goBack = () => {
        setShowComments(false);
        setCommentTarget(null);
        setProfileAddress('');
        setHideGetPosts('');
    }
  
    useEffect(() => {
      (async () => {
        if (howManyComments > 0) {
          await fetchComments();
        }
        setTriggerAudit(!triggerAudit);
      })();
    }, [getComments, commentTarget]);
  
    useEffect(() => {
      if (comments.length > 0) {
        auditNoMissingContent();
      }
    }, [triggerAudit]);

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
                        <p className="text-xs mx-1 mt-2">{commentTarget.processedReactions.length > 0 ? commentTarget.processedReactions.length : null}</p>
                        <div className="flex-grow"></div>
                        {walletConnected && <ReactionButton
                          targetKey={commentTarget.postKey}
                        />}
                        {walletConnected && <CommentButton
                          targetKey={commentTarget.postKey}
                        />}
                        {walletConnected && <RepostButton
                          targetKey={commentTarget.postKey}
                        />}
                    </div>
             </div>
            </div>
            {loading && <p className="border-4 p-2 shadow-lg">Loading comments...</p>}
            {errorMessage && <p className="border-4 p-2 shadow-lg">Error: {errorMessage}</p>}
            {!loading && warningMessage && <p className="border-4 p-2 shadow-lg">Warning: {warningMessage}</p>}
            {!loading && !errorMessage && Array.isArray(comments) && comments.map((comment) => {
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
                    </div>
                );
            })}
        </div>
    )
}