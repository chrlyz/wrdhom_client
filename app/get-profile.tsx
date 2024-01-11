import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import { getCID } from './utils/cid';
import ReactionButton from './reaction-button';
import { ProcessedReactions } from './get-posts';
import CommentButton from './comment-button';
import { faComments } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import RepostButton from './repost-button';

export default function GetProfile({
  getProfile,
  profilePosterAddress,
  setProfilePosterAddress,
  profileHowManyPosts,
  profileFromBlock,
  profileToBlock,
  setShowProfile,
  setHideGetPosts,
  walletConnected,
  setCommentTarget,
}: {
  getProfile: boolean,
  profilePosterAddress: string,
  setProfilePosterAddress: Dispatch<SetStateAction<string>>
  profileHowManyPosts: number,
  profileFromBlock: number,
  profileToBlock: number,
  setShowProfile: Dispatch<SetStateAction<boolean>>,
  setHideGetPosts: Dispatch<SetStateAction<string>>,
  walletConnected: boolean,
  setCommentTarget: Dispatch<SetStateAction<any>>
}) {
  const [posts, setPosts] = useState([] as any[]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [triggerAudit, setTriggerAudit] = useState(false);
  const [whenZeroPosts, setWhenZeroPosts] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setWarningMessage(null);
      setWhenZeroPosts(false);
      const response = await fetch(`/posts`+
      `?posterAddress=${profilePosterAddress}`+
      `&howMany=${profileHowManyPosts}`+
      `&fromBlock=${profileFromBlock}`+
      `&toBlock=${profileToBlock}`,
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
      const { PostState, ReactionState } = await import('wrdhom');
      const postsContractData = await fetchAccount({
        publicKey: 'B62qkWodZBcAAMtw6Q8bG37CYRgKjurS84tdhacLmSmnu3P719eUydF'
      }, '/graphql');
      const fetchedPostsRoot = postsContractData.account?.zkapp?.appState[2].toString();
      console.log('fetchedPostsRoot: ' + fetchedPostsRoot);
      const reactionsContractData = await fetchAccount({
        publicKey: 'B62qoiVJBGMS3zip5QDUVvCtK2ENPsg2GGyjaqMFV8fN6H265GoiomY'
      }, '/graphql');
      const fetchedReactionsRoot = reactionsContractData.account?.zkapp?.appState[3].toString();
      console.log('fetchedReactionsRoot: ' + fetchedReactionsRoot);

      // Remove post to cause a gap error
      //data.splice(2, 1);

      // Remove reaction to cause a gap error
      // data[2].reactionsResponse.splice(4, 1);


      // Audit that no post is missing at the edges
      if (data.length !== profileHowManyPosts) {
        setWarningMessage(`Expected ${profileHowManyPosts} posts, but got ${data.length}. This could be because there are not\
        as many posts that match your query, but the server could also be censoring posts at the edges of your query\
        (for example, if you expected to get posts 1, 2, 3, 4, and 5; post 1 or post 5 may be missing).` as any);
      }

      const processedData: {
        postState: JSON,
        postKey: string,
        postContentID: string,
        content: string,
        shortPosterAddressEnd: string,
        postsRoot: string,
        processedReactions: ProcessedReactions,
        top3Emojis: string[],
        numberOfComments: number
      }[] = [];
      
      for (let i = 0; i < data.length; i++) {
        const postStateJSON = JSON.parse(data[i].postState);
        const shortPosterAddressEnd = postStateJSON.posterAddress.slice(-12);
        const postWitness = MerkleMapWitness.fromJSON(data[i].postWitness);
        const postState = PostState.fromJSON(postStateJSON);
        let calculatedPostsRoot = postWitness.computeRootAndKey(postState.hash())[0].toString();
        console.log('calculatedPostsRoot: ' + calculatedPostsRoot);
        const processedReactions: ProcessedReactions = [];

        // Introduce different root to cause a root mismatch
        /*if (i === 0) {
          calculatedPostsRoot = 'wrongRoot'
        }*/

        // Introduce different block-length to cause block mismatch
        /*if (i === 2) {
          postStateJSON.postBlockHeight = 10000000000;
        }*/

        /*if (i === 2) {
          postStateJSON.posterAddress = 'wrongAddress';
        }*/

        /*if (i === 2) {
          data[i].content = 'wrong content';
        }*/

        // Audit that all posts are between the block range in the user query
        if (postStateJSON.postBlockHeight < profileFromBlock ||  postStateJSON.postBlockHeight > profileToBlock) {
          throw new Error(`Block-length ${postStateJSON.postBlockHeight} for Post ${postStateJSON.allPostsCounter} isn't between the block range\
          ${profileFromBlock} to ${profileToBlock}`);
        }

        // Audit that all roots calculated from the state of each post and their witnesses, match zkApp state
        if (fetchedPostsRoot !== calculatedPostsRoot) {
          throw new Error(`Post ${postStateJSON.allPostsCounter} has different root than zkApp state. The server may be experiencing some issues or\
          manipulating results for your query.`);
        }

        // Audit that all posts come from the profile we are visiting
        if (profilePosterAddress !== postStateJSON.posterAddress) {
          throw new Error(`Post ${postStateJSON.allPostsCounter} comes from a wrong address. All posts should come from address: ${profilePosterAddress}`);
        }

        // Audit that the content of posts matches the contentID signed by the author
        const cid = await getCID(data[i].content);
        if (cid !== data[i].postContentID) {
          throw new Error(`The content for Post ${postStateJSON.allPostsCounter} doesn't match the expected contentID. The server may be experiencing\
          some issues or manipulating the content it shows.`);
        }


        for (let r = 0; r < data[i].reactionsResponse.length; r++) {
          const reactionStateJSON = JSON.parse(data[i].reactionsResponse[r].reactionState);
          const reactionWitness = MerkleMapWitness.fromJSON(data[i].reactionsResponse[r].reactionWitness);
          const reactionState = ReactionState.fromJSON(reactionStateJSON);
          let calculatedReactionRoot = reactionWitness.computeRootAndKey(reactionState.hash())[0].toString();
          console.log('calculatedReactionRoot: ' + calculatedReactionRoot);

          // Audit that all roots calculated from the state of each reaction and their witnesses, match zkApp state
          if (fetchedReactionsRoot !== calculatedReactionRoot) {
            throw new Error(`Reaction ${reactionStateJSON.allReactionsCounter} has different root than zkApp state.\
            The server may be experiencing some issues or manipulating results for the reactions to Post ${postStateJSON.allPostsCounter}.`);
          }

          processedReactions.push({
            reactionState: reactionStateJSON,
            reactionEmoji: String.fromCodePoint(reactionStateJSON.reactionCodePoint),
            reactionsRoot: calculatedReactionRoot
          });
        }

        const emojis = processedReactions.map(reaction => reaction.reactionEmoji);
        const frequencyMap = new Map<string, number>();
        emojis.forEach(emoji => {
          const count = frequencyMap.get(emoji) || 0;
          frequencyMap.set(emoji, count + 1);
        });
        const sortedEmojis = Array.from(frequencyMap).sort((a, b) => b[1] - a[1]);
        const top3Emojis = sortedEmojis.slice(0, 3).map(item => item[0]);

        processedData.push({
          postState: postStateJSON,
          postKey: data[i].postKey,
          postContentID: data[i].postContentID,
          content: data[i].content,
          shortPosterAddressEnd: shortPosterAddressEnd,
          postsRoot: calculatedPostsRoot,
          processedReactions: processedReactions,
          top3Emojis: top3Emojis,
          numberOfComments: data[i].numberOfComments
        });
      };

      setPosts(processedData);
    } catch (e: any) {
        setLoading(false);
        setErrorMessage(e.message);
    }
  };

  const auditNoMissingContent = () => {
    try {
      for (let i = 0; i < posts.length-1; i++) {
        if (Number(posts[i].postState.userPostsCounter) !== Number(posts[i+1].postState.userPostsCounter)+1) {
          throw new Error(`Gap between posts ${posts[i].postState.userPostsCounter} and ${posts[i+1].postState.userPostsCounter}.\
          The server may be experiencing some issues or censoring posts.`);
        }

        for (let r = 0; r < Number(posts[i].processedReactions.length)-1; r++) {
          if (Number(posts[i].processedReactions[r].reactionState.targetReactionsCounter)
          !== Number(posts[i].processedReactions[r+1].reactionState.targetReactionsCounter)+1) {
            throw new Error(`Gap between reactions ${posts[i].processedReactions[r].reactionState.targetReactionsCounter} and\
            ${posts[i].processedReactions[r+1].reactionState.targetReactionsCounter}.\
            The server may be experiencing some issues or censoring posts.`);
          }
        }
      }
      setLoading(false);
    } catch (e: any) {
        setLoading(false);
        setErrorMessage(e.message);
    }
  }

  const goBack = () => {
    setShowProfile(false);
    setProfilePosterAddress('');
    setCommentTarget(null);
    setHideGetPosts('');
  }

  useEffect(() => {
    (async () => {
      await fetchPosts();
      setTriggerAudit(!triggerAudit);
    })();
  }, [getProfile]);

  useEffect(() => {
    if (posts.length > 0) {
      auditNoMissingContent();
    }
  }, [triggerAudit]);

  return (
    <div className="w-3/5 p-4 overflow-y-auto max-h-[100vh]">
    <div className="p-2 border-b-2 shadow-lg">
        <button className="hover:underline m-2" onClick={goBack}>{'<- Go back to feed'}</button>
        <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-all">
            <p >{`Posts from user:\n\n${profilePosterAddress}`}</p>
        </div>
    </div>
      {loading && <p className="border-4 p-2 shadow-lg">Loading posts...</p>}
      {errorMessage && <p className="border-4 p-2 shadow-lg break-words">Error: {errorMessage}</p>}
      {!loading && warningMessage && <p className="border-4 p-2 shadow-lg">Warning: {warningMessage}</p>}
      {!loading && !errorMessage && Array.isArray(posts) && posts.map((post) => {
        const postIdentifier = post.postState.posterAddress + post.postContentID;
        return (
            <div key={postIdentifier} className="p-2 border-b-2 shadow-lg">
                <div className="flex items-center border-4 p-2 shadow-lg text-xs text-white bg-black">
                    <p className="mr-8">{post.shortPosterAddressEnd}</p>
                    <p className="mr-4">{'User Post: ' + post.postState.userPostsCounter}</p>
                    <div className="flex-grow"></div>
                    <p className="mr-1">{'Block:' + post.postState.postBlockHeight}</p>
                </div>
                <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-all">
                    <p>{post.content}</p>
                </div>
                <div className="flex flex-row">
                  {post.top3Emojis.map((emoji: string) => emoji)}
                  <p className="text-xs ml-2 mt-2">{post.processedReactions.length > 0 ? post.processedReactions.length : null}</p>
                  {post.numberOfComments > 0 ? <button
                    className="hover:text-lg ml-2"
                    onClick={() => setCommentTarget(post)}
                  >
                    <FontAwesomeIcon icon={faComments} />
                  </button> : null}
                  <p className="text-xs ml-2 mt-2">{post.numberOfComments > 0 ? post.numberOfComments : null}</p>
                  <div className="flex-grow"></div>
                  {walletConnected && <ReactionButton
                    targetKey={post.postKey}
                  />}
                  {walletConnected && <CommentButton
                    targetKey={post.postKey}
                  />}
                  {walletConnected && <RepostButton
                    targetKey={post.postKey}
                  />}
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
  );
};
