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
  setShowComments,
  commentsContractAddress
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
  setShowComments: Dispatch<SetStateAction<boolean>>,
  commentsContractAddress: string
}) {
    const [comments, setComments] = useState([] as any[]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
    const [triggerAudit1, setTriggerAudit1] = useState(false);
    const [triggerAudit2, setTriggerAudit2] = useState(false);

    const fetchComments = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
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
              commentWitness: data.commentResponse[i].commentWitness,
              commentKey: data.commentsResponse[i].commentKey,
              commentContentID: data.commentsResponse[i].commentContentID,
              content: data.commentsResponse[i].content,
              shortCommenterAddressEnd: shortCommenterAddressEnd
          });
        };
  
        setComments(processedData);

      } catch (e: any) {
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
        console.log('fetchedTargetsCommentsCountersRoot: ' + fetchedTargetsCommentsCountersRoot);
        const fetchedCommentsRoot = commentsContractData.account?.zkapp?.appState[3].toString();
        console.log('fetchedCommentsRoot: ' + fetchedCommentsRoot);
  
        // Remove comment to cause a gap error
        comments.splice(1, 1);
        
        for (let i = 0; i < comments.length; i++) {
          const shortCommenterAddressEnd = comments[i].commentState.commenterAddress.slice(-12);
          const commentWitness = MerkleMapWitness.fromJSON(comments[i].commentWitness);
          const commentState = CommentState.fromJSON(comments[i].commentState);
          let calculatedCommentsRoot = commentWitness.computeRootAndKey(commentState.hash())[0].toString();
          console.log('calculatedCommentsRoot: ' + calculatedCommentsRoot);
  
          // Introduce different root to cause a root mismatch
          /*if (i === 1) {
            calculatedCommentsRoot = 'badRoot'
          }*/
  
          // Introduce different block-length to cause block mismatch
          /*if (i === 1) {
            comments[i].commentState.commentBlockHeight = 10000000000;
          }*/
  
          // Introduce different content to cause content mismatch
          /*if (i === 1) {
            comments[i].content = 'wrong content';
          }*/
  
          // Audit that all comments are between the block range in the user query
          if (comments[i].commentState.commentBlockHeight < fromBlockComments ||  comments[i].commentState.commentBlockHeight > toBlockComments) {
            throw new Error(`Block-length ${comments[i].commentState.commentBlockHeight} for Comment ${comments[i].commentState.targetCommentsCounter} isn't between the block range\
            ${fromBlockComments} to ${toBlockComments}`);
          }
  
          // Audit that all roots calculated from the state of each comment and their witnesses, match zkApp state
          if (fetchedCommentsRoot !== calculatedCommentsRoot) {
            throw new Error(`Comment ${comments[i].commentState.targetCommentsCounter} has different root than zkApp state. The server may be experiencing some issues or\
            manipulating results for your query.`);
          }    
  
          // Audit that the content of comments matches the contentID signed by the author
          const cid = await getCID(comments[i].content);
          if (cid !== comments[i].commentContentID) {
            throw new Error(`The content for Comment ${comments[i].commentState.targetCommentsCounter} doesn't match the expected contentID. The server may be experiencing\
            some issues or manipulating the content it shows.`);
          }
        };

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
        setTriggerAudit1(!triggerAudit1);
      })();
    }, [getComments, commentTarget]);

    useEffect(() => {
      (async () => {
        await auditComments();
        setTriggerAudit2(!triggerAudit2);
      })();
    }, [triggerAudit1]);
  
    useEffect(() => {
      if (comments.length > 0) {
        auditNoMissingContent();
      }
    }, [triggerAudit2]);

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
                    </div>
                );
            })}
        </div>
    )
}