import { useState, useEffect } from 'react';
import { getCID } from './utils/cid';
import { Dispatch, SetStateAction } from "react";
import ReactionButton from './reaction-button';
import CommentButton from './comment-button';

export default function GetComments({
commentTarget,
setProfilePosterAddress,
howManyComments,
commentsFromBlock,
commentsToBlock,
getComments,
walletConnected,
setCommentTarget,
setHideGetPosts,
setShowComments
}: {
commentTarget: any,
setProfilePosterAddress: Dispatch<SetStateAction<string>>,
howManyComments: number,
commentsFromBlock: number,
commentsToBlock: number,
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
    const [selectedPosterAddress, setSelectedPosterAddress] = useState('');
    const [triggerAudit, setTriggerAudit] = useState(false);
    const [whenZeroPosts, setWhenZeroPosts] = useState(false);
  
    const fetchComments = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        setWarningMessage(null);
        setWhenZeroPosts(false);
        const response = await fetch(`/comments`+
            `?targetKey=${commentTarget.postKey}`+
            `&howMany=${howManyComments}`+
            `&commentsFromBlock=${commentsFromBlock}`+
            `&commentsToBlock=${commentsToBlock}`,
          {
            headers: {'Cache-Control': 'no-cache'}
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: any[] = await response.json();
        if (data.length === 0) {
          setLoading(false);
          setWhenZeroPosts(true);
        }
        const { MerkleMapWitness, fetchAccount } = await import('o1js');
        const { CommentState } = await import('wrdhom');
        const commentsContractData = await fetchAccount({
          publicKey: 'B62qnxJbevpvzHFSRAJJo1MTGLkfsyWTNimPj33jDXEtYjiNvbA34wY'
        }, '/graphql');
        const fetchedCommentsRoot = commentsContractData.account?.zkapp?.appState[3].toString();
        console.log('fetchedCommentsRoot: ' + fetchedCommentsRoot);
  
        // Remove comment to cause a gap error
        //data.splice(2, 1);
  
        // Audit that no comment is missing at the edges
        if (data.length !== howManyComments) {
          setWarningMessage(`Expected ${howManyComments} comments, but got ${data.length}. This could be because there are not\
          as many comments that match your query, but the server could also be censoring comments at the edges of your query\
          (for example, if you expected to get comments 1, 2, 3, 4, and 5; comment 1 or comment 5 may be missing).` as any);
        }
  
        const processedData: {
          commentState: JSON,
          commentKey: string,
          commentContentID: string,
          content: string,
          shortCommenterAddressEnd: string,
          commentsRoot: string
        }[] = [];
        
        for (let i = 0; i < data.length; i++) {
          const commentStateJSON = JSON.parse(data[i].commentState);
          const shortCommenterAddressEnd = commentStateJSON.commenterAddress.slice(-12);
          const commentWitness = MerkleMapWitness.fromJSON(data[i].commentWitness);
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
            data[i].content = 'wrong content';
          }*/
  
          // Audit that all comments are between the block range in the user query
          if (commentStateJSON.commentBlockHeight < commentsFromBlock ||  commentStateJSON.commentBlockHeight > commentsToBlock) {
            throw new Error(`Block-length ${commentStateJSON.commentBlockHeight} for Comment ${commentStateJSON.targetCommentsCounter} isn't between the block range\
            ${commentsFromBlock} to ${commentsToBlock}`);
          }
  
          // Audit that all roots calculated from the state of each comment and their witnesses, match zkApp state
          if (fetchedCommentsRoot !== calculatedCommentsRoot) {
            throw new Error(`Comment ${commentStateJSON.targetCommentsCounter} has different root than zkApp state. The server may be experiencing some issues or\
            manipulating results for your query.`);
          }    
  
          // Audit that the content of comments matches the contentID signed by the author
          const cid = await getCID(data[i].content);
          if (cid !== data[i].commentContentID) {
            throw new Error(`The content for Comment ${commentStateJSON.targetCommentsCounter} doesn't match the expected contentID. The server may be experiencing\
            some issues or manipulating the content it shows.`);
          }
  
          processedData.push({
              commentState: commentStateJSON,
              commentKey: data[i].commentKey,
              commentContentID: data[i].commentContentID,
              content: data[i].content,
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
        setProfilePosterAddress('');
        setHideGetPosts('');
    }
  
    useEffect(() => {
      (async () => {
        await fetchComments();
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
                        onMouseEnter={() => setSelectedPosterAddress(commentTarget.postState.posterAddress)}
                        onClick={() => setProfilePosterAddress(selectedPosterAddress)}
                        >
                        <p className="mr-8">{commentTarget.shortPosterAddressEnd}</p>
                        </span>
                        <p className="mr-4">{'Post:' + commentTarget.postState.allPostsCounter}</p>
                    </div>
                    <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-all">
                        <p>{commentTarget.content}</p>
                    </div>
                    <div className="flex flex-row">
                        {commentTarget.top3Emojis.map((emoji: string) => emoji)}
                        <p className="text-xs mx-1 mt-2">{commentTarget.processedReactions.length > 0 ? commentTarget.processedReactions.length : null}</p>
                        <div className="flex-grow"></div>
                        {walletConnected && <ReactionButton
                            posterAddress={commentTarget.postState.posterAddress}
                            postContentID={commentTarget.postContentID}
                        />}
                        {walletConnected && <CommentButton
                            posterAddress={commentTarget.postState.posterAddress}
                            postContentID={commentTarget.postContentID}
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
                            onMouseEnter={() => setSelectedPosterAddress(comment.commentState.commenterAddress)}
                            onClick={() => setProfilePosterAddress(selectedPosterAddress)}
                            >
                            <p className="mr-8">{comment.shortCommenterAddressEnd}</p>
                            </span>
                            <p className="mr-4">{'Comment:' + comment.commentState.targetCommentsCounter}</p>
                        </div>
                        <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-all">
                            <p>{comment.content}</p>
                        </div>
                    </div>
                );
            })}
            {whenZeroPosts && <div className="p-2 border-b-2 shadow-lg">
                <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-all">
                    <p >The query threw zero posts</p>
                </div>
            </div>}
        </div>
    )
}