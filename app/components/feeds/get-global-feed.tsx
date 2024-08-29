import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import { getCID } from '../../utils/cid';
import ItemContentList from './content-item';
import CreatePost from '../posts/create-post';
import { CommentState, PostState, ReactionState, RepostState } from 'wrdhom';
import { ContentType, EmbeddedReactions } from '../../types';

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

  const fetchItems = async (type: ContentType) => {
    try {
      const endpoint = type === 'posts' ? '/posts' : '/reposts';
      const queryParams = type === 'posts' 
        ? `?howMany=${howManyPosts}&fromBlock=${fromBlock}&toBlock=${toBlock}&currentUser=${account[0]}`
        : `?howMany=${howManyReposts}&fromBlock=${fromBlockReposts}&toBlock=${toBlockReposts}`;

      const response = await fetch(`${endpoint}${queryParams}`, {
        headers: {'Cache-Control': 'no-cache'}
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: any = await response.json();
      const itemsResponse = type === 'posts' ? data.postsResponse : data.repostsResponse;

      if (itemsResponse.length === 0) {
        return;
      }

      const processedItems = itemsResponse.map((item: any) => processItem(item, type));

      if (type === 'posts') {
        setPosts(processedItems);
      } else {
        setReposts(processedItems);
      }

    } catch (e: any) {
      console.log(e);
      setLoading(false);
      setErrorMessage(e.message);
    }
  };

  const processItem = (item: any, type: ContentType) => {
    const postStateJSON = JSON.parse(type === 'posts' ? item.postState : item.postState);
    const repostStateJSON = type === 'reposts' ? JSON.parse(item.repostState) : undefined;

    const shortPosterAddressEnd = postStateJSON.posterAddress.slice(-12);
    const shortReposterAddressEnd = repostStateJSON?.reposterAddress.slice(-12);

    const { allEmbeddedReactions, filteredEmbeddedReactions } = processReactions(item.embeddedReactions);
    const top3Emojis = getTop3Emojis(filteredEmbeddedReactions);

    const { embeddedComments, numberOfNonDeletedComments } = processComments(item.embeddedComments, item.numberOfComments);
    const { embeddedReposts, numberOfNonDeletedReposts } = processReposts(item.embeddedReposts, item.numberOfReposts);

    const baseProcessedItem = {
      postState: postStateJSON,
      postWitness: JSON.parse(item.postWitness),
      postKey: item.postKey,
      postContentID: item.postContentID,
      content: item.content,
      shortPosterAddressEnd,
      allEmbeddedReactions,
      filteredEmbeddedReactions,
      top3Emojis,
      numberOfReactions: item.numberOfReactions,
      numberOfReactionsWitness: JSON.parse(item.numberOfReactionsWitness),
      embeddedComments,
      numberOfComments: item.numberOfComments,
      numberOfCommentsWitness: JSON.parse(item.numberOfCommentsWitness),
      numberOfNonDeletedComments,
      embeddedReposts,
      numberOfReposts: item.numberOfReposts,
      numberOfRepostsWitness: JSON.parse(item.numberOfRepostsWitness),
      numberOfNonDeletedReposts,
    };

    if (type === 'posts') {
      return {
        ...baseProcessedItem,
        currentUserRepostState: item.currentUserRepostState ? JSON.parse(item.currentUserRepostState) : undefined,
        currentUserRepostKey: item.currentUserRepostKey,
        currentUserRepostWitness: item.currentUserRepostWitness ? JSON.parse(item.currentUserRepostWitness) : undefined,
      };
    } else {
      return {
        ...baseProcessedItem,
        repostState: repostStateJSON,
        repostWitness: JSON.parse(item.repostWitness),
        repostKey: item.repostKey,
        shortReposterAddressEnd,
      };
    }
  };

  const processReactions = (embeddedReactions: any[]) => {
    const allEmbeddedReactions: EmbeddedReactions[] = [];
    const filteredEmbeddedReactions: EmbeddedReactions[] = [];

    embeddedReactions.forEach(reaction => {
      const reactionStateJSON = JSON.parse(reaction.reactionState);
      const processedReaction = {
        reactionState: reactionStateJSON,
        reactionWitness: JSON.parse(reaction.reactionWitness),
        reactionEmoji: String.fromCodePoint(reactionStateJSON.reactionCodePoint),
      };

      allEmbeddedReactions.push(processedReaction);
      if (Number(reactionStateJSON.deletionBlockHeight) === 0) {
        filteredEmbeddedReactions.push(processedReaction);
      }
    });

    return { allEmbeddedReactions, filteredEmbeddedReactions };
  };

  const getTop3Emojis = (filteredEmbeddedReactions: EmbeddedReactions[]) => {
    const emojis = filteredEmbeddedReactions.map(reaction => reaction.reactionEmoji);
    const frequencyMap = new Map<string, number>();
    emojis.forEach(emoji => {
      const count = frequencyMap.get(emoji) || 0;
      frequencyMap.set(emoji, count + 1);
    });
    const sortedEmojis = Array.from(frequencyMap).sort((a, b) => b[1] - a[1]);
    return sortedEmojis.slice(0, 3).map(item => item[0]);
  };

  const processComments = (embeddedComments: any[], totalComments: number) => {
    let numberOfDeletedComments = 0;
    const processedComments = embeddedComments.map(comment => {
      const commentStateJSON = JSON.parse(comment.commentState);
      numberOfDeletedComments += Number(commentStateJSON.deletionBlockHeight) === 0 ? 0 : 1;
      return {
        commentState: commentStateJSON,
        commentWitness: JSON.parse(comment.commentWitness)
      };
    });
    const numberOfNonDeletedComments = Number(totalComments) - numberOfDeletedComments;
    return { embeddedComments: processedComments, numberOfNonDeletedComments };
  };

  const processReposts = (embeddedReposts: any[], totalReposts: number) => {
    let numberOfDeletedReposts = 0;
    const processedReposts = embeddedReposts.map(repost => {
      const repostStateJSON = JSON.parse(repost.repostState);
      numberOfDeletedReposts += Number(repostStateJSON.deletionBlockHeight) === 0 ? 0 : 1;
      return {
        repostState: repostStateJSON,
        repostWitness: JSON.parse(repost.repostWitness)
      };
    });
    const numberOfNonDeletedReposts = Number(totalReposts) - numberOfDeletedReposts;
    return { embeddedReposts: processedReposts, numberOfNonDeletedReposts };
  };

  const auditPosts = async () => {
    try {
      // Remove post to cause a gap error
      //posts.splice(0, 2);

      const { MerkleMapWitness, fetchAccount, Field } = await import('o1js');
      const { PostState, ReactionState, CommentState, RepostState } = await import('wrdhom');

      const postsContractData = await fetchAccount({
        publicKey: postsContractAddress
      }, '/graphql');
      const fetchedPostsRoot = postsContractData.account?.zkapp?.appState[2].toString();

      const reactionsContractData = await fetchAccount({
        publicKey: reactionsContractAddress
      }, '/graphql');
      const fetchedTargetsReactionsCountersRoot = reactionsContractData.account?.zkapp?.appState[2].toString();
      const fetchedReactionsRoot = reactionsContractData.account?.zkapp?.appState[3].toString();

      const commentsContractData = await fetchAccount({
        publicKey: commentsContractAddress
      }, '/graphql');
      const fetchedTargetsCommentsCountersRoot = commentsContractData.account?.zkapp?.appState[2].toString();
      const fetchedCommentsRoot = commentsContractData.account?.zkapp?.appState[3].toString();

      const repostsContractData = await fetchAccount({
        publicKey: repostsContractAddress
      }, '/graphql');
      const fetchedTargetsRepostsCountersRoot = repostsContractData.account?.zkapp?.appState[2].toString();
      const fetchedRepostsRoot = repostsContractData.account?.zkapp?.appState[3].toString();

      // Remove reaction to cause a gap error
      // posts[4].allEmbeddedReactions.splice(1, 1);

      for (let i = 0; i < posts.length; i++) {

        const postState = PostState.fromJSON(posts[i].postState) as PostState;
        const postWitness = MerkleMapWitness.fromJSON(posts[i].postWitness);
        let calculatedPostsRoot = postWitness.computeRootAndKeyV2(postState.hash())[0].toString();

        // Introduce different root to cause a root mismatch
        /*if (i === 0) {
          calculatedPostsRoot = 'badRoot'
        }*/

        if (fetchedPostsRoot !== calculatedPostsRoot) {
          throw new Error(`Post ${posts[i].postState.allPostsCounter} has different root than zkApp state. The server may be experiencing some issues or\
          manipulating results for your query.`);
        }

        if (Number(posts[i].postState.deletionBlockHeight) === 0) {
          const numberOfReactionsWitness = MerkleMapWitness.fromJSON(posts[i].numberOfReactionsWitness);
          const numberOfCommentsWitness = MerkleMapWitness.fromJSON(posts[i].numberOfCommentsWitness);
          const numberOfRepostsWitness = MerkleMapWitness.fromJSON(posts[i].numberOfRepostsWitness);
          let calculatedTargetsReactionsCountersRoot = numberOfReactionsWitness.computeRootAndKeyV2(
            Field(posts[i].numberOfReactions))[0].toString();
          let calculatedTargetsCommentsCountersRoot = numberOfCommentsWitness.computeRootAndKeyV2(
            Field(posts[i].numberOfComments))[0].toString();
          let calculatedTargetsRepostsCountersRoot = numberOfRepostsWitness.computeRootAndKeyV2(
            Field(posts[i].numberOfReposts))[0].toString();
  
          // Introduce different block-length to cause block mismatch
          /*if (i === 0) {
            posts[i].postState.postBlockHeight = 10000000000;
          }*/
  
          // Introduce different content to cause content mismatch
          /*if (i === 0) {
            posts[i].content = 'wrong content';
          }*/
  
          // Audit that all posts are between the block range in the user query
          if (posts[i].postState.postBlockHeight < fromBlock ||  posts[i].postState.postBlockHeight > toBlock) {
            throw new Error(`Block-length ${posts[i].postState.postBlockHeight} for Post ${posts[i].postState.allPostsCounter} isn't between the block range\
            ${fromBlock} to ${toBlock}`);
          }
  
          // Audit that the on-chain state matches the off-chain state
  
          if (fetchedTargetsReactionsCountersRoot !== calculatedTargetsReactionsCountersRoot ) {
            throw new Error(`Server stated that there are ${posts[i].numberOfReactions} reactions for post ${posts[i].postState.allPostsCounter},\
            but the contract accounts for a different amount. The server may be experiencing issues or manipulating responses.`);
          }
  
          if (fetchedTargetsCommentsCountersRoot !== calculatedTargetsCommentsCountersRoot) {
            throw new Error(`Server stated that there are ${posts[i].numberOfComments} comments for post ${posts[i].postState.allPostsCounter},\
            but the contract accounts for a different amount. The server may be experiencing issues or manipulating responses.`);
          }
  
          if (fetchedTargetsRepostsCountersRoot !== calculatedTargetsRepostsCountersRoot) {
            throw new Error(`Server stated that there are ${posts[i].numberOfReposts} reposts for post ${posts[i].postState.allPostsCounter},\
            but the contract accounts for a different amount. The server may be experiencing issues or manipulating responses.`);
          }
  
          // Audit that the content of posts matches the contentID signed by the author
          const cid = await getCID(posts[i].content);
          if (cid !== posts[i].postContentID) {
            throw new Error(`The content for Post ${posts[i].postState.allPostsCounter} doesn't match the expected contentID. The server may be experiencing\
            some issues or manipulating the content it shows.`);
          }
  
          // Audit that the number of reactions the server retrieves, matches the number of reactions accounted on the zkApp state
          if(posts[i].allEmbeddedReactions.length !== posts[i].numberOfReactions) {
            throw new Error(`Server stated that there are ${posts[i].numberOfReactions} reactions for post ${posts[i].postState.allPostsCounter},\
            but it only provided ${posts[i].allEmbeddedReactions.length} reactions. The server may be experiencing some issues or manipulating
            the content it shows.`)
          }
  
          for (let r = 0; r < posts[i].allEmbeddedReactions.length; r++) {
            const reactionStateJSON = posts[i].allEmbeddedReactions[r].reactionState;
            const reactionWitness = MerkleMapWitness.fromJSON(posts[i].allEmbeddedReactions[r].reactionWitness);
            const reactionState = ReactionState.fromJSON(reactionStateJSON) as ReactionState;
            let calculatedReactionRoot = reactionWitness.computeRootAndKeyV2(reactionState.hash())[0].toString();
  
            // Audit that all roots calculated from the state of each reaction and their witnesses, match zkApp state
            if (fetchedReactionsRoot !== calculatedReactionRoot) {
              throw new Error(`Reaction ${reactionStateJSON.allReactionsCounter} has different root than zkApp state.\
              The server may be experiencing some issues or manipulating results for the reactions to Post ${posts[i].postState.allPostsCounter}.`);
            }
          }

          // Audit that the number of comments the server retrieves, matches the number of comments accounted on the zkApp state
          if(posts[i].embeddedComments.length !== posts[i].numberOfComments) {
            throw new Error(`Server stated that there are ${posts[i].numberOfComments} comments for post ${posts[i].postState.allPostsCounter},\
            but it only provided ${posts[i].embeddedComments.length} comments. The server may be experiencing some issues or manipulating
            the content it shows.`)
          }
  
          for (let c = 0; c < posts[i].embeddedComments.length; c++) {
            const commentStateJSON = posts[i].embeddedComments[c].commentState;
            const commentWitness = MerkleMapWitness.fromJSON(posts[i].embeddedComments[c].commentWitness);
            const commentState = CommentState.fromJSON(commentStateJSON) as CommentState;
            let calculatedCommentRoot = commentWitness.computeRootAndKeyV2(commentState.hash())[0].toString();
  
            // Audit that all roots calculated from the state of each comment and their witnesses, match zkApp state
            if (fetchedCommentsRoot !== calculatedCommentRoot) {
              throw new Error(`Comment ${commentStateJSON.allCommentsCounter} has different root than zkApp state.\
              The server may be experiencing some issues or manipulating results for the comments to Post ${posts[i].postState.allPostsCounter}.`);
            }
          }

          // Audit that the number of reposts the server retrieves, matches the number of reposts accounted on the zkApp state
          if(posts[i].embeddedReposts.length !== posts[i].numberOfReposts) {
            throw new Error(`Server stated that there are ${posts[i].numberOfReposts} reposts for post ${posts[i].postState.allPostsCounter},\
            but it only provided ${posts[i].embeddedReposts.length} reposts. The server may be experiencing some issues or manipulating
            the content it shows.`)
          }
  
          for (let rp = 0; rp < posts[i].embeddedReposts.length; rp++) {
            const repostStateJSON = posts[i].embeddedReposts[rp].repostState;
            const repostWitness = MerkleMapWitness.fromJSON(posts[i].embeddedReposts[rp].repostWitness);
            const repostState = RepostState.fromJSON(repostStateJSON) as RepostState;
            let calculatedRepostRoot = repostWitness.computeRootAndKeyV2(repostState.hash())[0].toString();
  
            // Audit that all roots calculated from the state of each repost and their witnesses, match zkApp state
            if (fetchedRepostsRoot !== calculatedRepostRoot) {
              throw new Error(`Repost ${repostStateJSON.allRepostsCounter} has different root than zkApp state.\
              The server may be experiencing some issues or manipulating results for the reposts to Post ${posts[i].postState.allPostsCounter}.`);
            }
          }
        }
      };
    } catch (e: any) {
        console.log(e);
        setLoading(false);
        setErrorMessage(e.message);
    }
  };

  

  const auditReposts = async () => {
    try {
      // Remove repost to cause a gap error
      // reposts.splice(1, 1);

      if (reposts.length === 0) {
        return;
      }
      const { MerkleMapWitness, fetchAccount, Field } = await import('o1js');
      const { PostState, ReactionState, RepostState, CommentState } = await import('wrdhom');

      const postsContractData = await fetchAccount({
        publicKey: postsContractAddress
      }, '/graphql');
      const fetchedPostsRoot = postsContractData.account?.zkapp?.appState[2].toString();
      const reactionsContractData = await fetchAccount({
        publicKey: reactionsContractAddress
      }, '/graphql');
      const fetchedTargetsReactionsCountersRoot = reactionsContractData.account?.zkapp?.appState[2].toString();
      const fetchedReactionsRoot = reactionsContractData.account?.zkapp?.appState[3].toString();

      const commentsContractData = await fetchAccount({
        publicKey: commentsContractAddress
      }, '/graphql');
      const fetchedTargetsCommentsCountersRoot = commentsContractData.account?.zkapp?.appState[2].toString();
      const fetchedCommentsRoot = commentsContractData.account?.zkapp?.appState[3].toString();

      const repostsContractData = await fetchAccount({
        publicKey: repostsContractAddress
      }, '/graphql');
      const fetchedTargetsRepostsCountersRoot = repostsContractData.account?.zkapp?.appState[2].toString();
      const fetchedRepostsRoot = repostsContractData.account?.zkapp?.appState[3].toString();

      // Remove reaction to cause a gap error
      // reposts[2].allEmbeddedReactions.splice(1, 1);

      for (let i = 0; i < reposts.length; i++) {

        const repostWitness = MerkleMapWitness.fromJSON(reposts[i].repostWitness);
        const repostState = RepostState.fromJSON(reposts[i].repostState)as RepostState;
        let calculatedRepostsRoot = repostWitness.computeRootAndKeyV2(repostState.hash())[0].toString();

        // Introduce different root to cause a root mismatch
        /*if (i === 0) {
          calculatedRepostsRoot = 'badRoot'
        }*/

        if (fetchedRepostsRoot !== calculatedRepostsRoot) {
          throw new Error(`Repost ${reposts[i].repostState.allRepostsCounter} has different root than zkApp state. The server may be experiencing some issues or\
          manipulating results for your query.`);
        }

        if (Number(reposts[i].repostState.deletionBlockHeight) === 0 && Number(reposts[i].postState.deletionBlockHeight === 0)) {
          const postWitness = MerkleMapWitness.fromJSON(reposts[i].postWitness);
          const numberOfReactionsWitness = MerkleMapWitness.fromJSON(reposts[i].numberOfReactionsWitness);
          const numberOfCommentsWitness = MerkleMapWitness.fromJSON(reposts[i].numberOfCommentsWitness);
          const numberOfRepostsWitness = MerkleMapWitness.fromJSON(reposts[i].numberOfRepostsWitness);
          const postState = PostState.fromJSON(reposts[i].postState) as PostState;
          let calculatedPostsRoot = postWitness.computeRootAndKeyV2(postState.hash())[0].toString();
          let calculatedTargetsReactionsCountersRoot = numberOfReactionsWitness.computeRootAndKeyV2(
            Field(reposts[i].numberOfReactions))[0].toString();
          let calculatedTargetsCommentsCountersRoot = numberOfCommentsWitness.computeRootAndKeyV2(
            Field(reposts[i].numberOfComments))[0].toString();
          let calculatedTargetsRepostsCountersRoot = numberOfRepostsWitness.computeRootAndKeyV2(
            Field(reposts[i].numberOfReposts))[0].toString();
  
          // Introduce different block-length to cause block mismatch
          /*if (i === 0) {
            reposts[i].repostState.repostBlockHeight = 10000000000;
          }*/
  
          // Introduce different content to cause content mismatch
          /*if (i === 0) {
            reposts[i].content = 'wrong content';
          }*/
  
          // Audit that all reposts are between the block range in the user query
          if (reposts[i].repostState.repostBlockHeight < fromBlockReposts ||  reposts[i].repostState.repostBlockHeight > toBlockReposts) {
            throw new Error(`Block-length ${reposts[i].repostState.repostBlockHeight} for Repost ${reposts[i].repostState.allRepostsCounter} isn't between the block range\
            ${fromBlockReposts} to ${toBlockReposts}`);
          }
  
          // Audit that the on-chain state matches the off-chain state
  
          if (fetchedPostsRoot !== calculatedPostsRoot) {
            throw new Error(`Post ${reposts[i].postState.allPostsCounter} from Repost ${reposts[i].repostState.allRepostsCounter} has different root than zkApp state.\
            The server may be experiencing some issues or manipulating results for your query.`);
          }
  
          if (fetchedTargetsReactionsCountersRoot !== calculatedTargetsReactionsCountersRoot ) {
            throw new Error(`Server stated that there are ${reposts[i].numberOfReactions} reactions for Post ${reposts[i].postState.allPostsCounter}\
            from Repost ${reposts[i].repostState.allRepostsCounter} but the contract accounts for a different amount. The server may be experiencing issues or\
            manipulating responses.`);
          }
  
          if (fetchedTargetsCommentsCountersRoot !== calculatedTargetsCommentsCountersRoot) {
            throw new Error(`Server stated that there are ${reposts[i].numberOfComments} comments for Post ${reposts[i].postState.allPostsCounter}\
            from Repost ${reposts[i].repostState.allRepostsCounter}, but the contract accounts for a different amount. The server may be experiencing issues or\
            manipulating responses.`);
          }
  
          if (fetchedTargetsRepostsCountersRoot !== calculatedTargetsRepostsCountersRoot) {
            throw new Error(`Server stated that there are ${reposts[i].numberOfReposts} reposts for Post ${reposts[i].postState.allPostsCounter}\
            from Repost ${reposts[i].repostState.allRepostsCounter}, but the contract accounts for a different amount. The server may be experiencing issues or\
            manipulating responses.`);
          }
  
          // Audit that the content of the reposted posts matches the contentID signed by the post author
          const cid = await getCID(reposts[i].content);
          if (cid !== reposts[i].postContentID) {
            throw new Error(`The content for Post ${reposts[i].postState.allPostsCounter} from Repost ${reposts[i].repostState.allRepostsCounter} doesn't match\
            the expected contentID. The server may be experiencing some issues or manipulating the content it shows.`);
          }
  
          // Audit that the number of reactions the server retrieves, matches the number of reactions accounted on the zkApp state
          if(reposts[i].allEmbeddedReactions.length !== reposts[i].numberOfReactions) {
            throw new Error(`Server stated that there are ${reposts[i].numberOfReactions} reactions for Post ${reposts[i].postState.allPostsCounter}\
            from Repost ${reposts[i].repostState.allRepostsCounter} but it only provided ${reposts[i].allEmbeddedReactions.length} reactions. The server\
            may be experiencing some issues or manipulating the content it shows.`)
          }
  
          for (let r = 0; r < reposts[i].allEmbeddedReactions.length; r++) {
            const reactionStateJSON = reposts[i].allEmbeddedReactions[r].reactionState;
            const reactionWitness = MerkleMapWitness.fromJSON(reposts[i].allEmbeddedReactions[r].reactionWitness);
            const reactionState = ReactionState.fromJSON(reactionStateJSON) as ReactionState;
            let calculatedReactionRoot = reactionWitness.computeRootAndKeyV2(reactionState.hash())[0].toString();
  
            // Audit that all roots calculated from the state of each reaction and their witnesses, match zkApp state
            if (fetchedReactionsRoot !== calculatedReactionRoot) {
              throw new Error(`Reaction ${reactionStateJSON.allReactionsCounter} has different root than zkApp state.\
              The server may be experiencing some issues or manipulating results for the reactions to Post ${reposts[i].postState.allPostsCounter}.`);
            }
          }
  
          // Audit that the number of comments the server retrieves, matches the number of comments accounted on the zkApp state
          if(reposts[i].embeddedComments.length !== reposts[i].numberOfComments) {
            throw new Error(`Server stated that there are ${reposts[i].numberOfComments} comments for repost ${reposts[i].repostState.allRepostsCounter},\
            but it only provided ${reposts[i].embeddedComments.length} comments. The server may be experiencing some issues or manipulating
            the content it shows.`)
          }
  
          for (let c = 0; c < reposts[i].embeddedComments.length; c++) {
            const commentStateJSON = reposts[i].embeddedComments[c].commentState;
            const commentWitness = MerkleMapWitness.fromJSON(reposts[i].embeddedComments[c].commentWitness);
            const commentState = CommentState.fromJSON(commentStateJSON) as CommentState;
            let calculatedCommentRoot = commentWitness.computeRootAndKeyV2(commentState.hash())[0].toString();
  
            // Audit that all roots calculated from the state of each comment and their witnesses, match zkApp state
            if (fetchedCommentsRoot !== calculatedCommentRoot) {
              throw new Error(`Comment ${commentStateJSON.allCommentsCounter} has different root than zkApp state.\
              The server may be experiencing some issues or manipulating results for the comments to Post ${reposts[i].postState.allPostsCounter}
              from Repost ${reposts[i].repostState.allRepostsCounter}`);
            }
          }

          // Audit that the number of reposts the server retrieves, matches the number of reposts accounted on the zkApp state
          if(reposts[i].embeddedReposts.length !== reposts[i].numberOfReposts) {
            throw new Error(`Server stated that there are ${reposts[i].numberOfReposts} reposts for repost ${reposts[i].repostState.allRepostsCounter},\
            but it only provided ${reposts[i].embeddedReposts.length} reposts. The server may be experiencing some issues or manipulating
            the content it shows.`)
          }
  
          for (let rp = 0; rp < reposts[i].embeddedReposts.length; rp++) {
            const repostStateJSON = reposts[i].embeddedReposts[rp].repostState;
            const repostWitness = MerkleMapWitness.fromJSON(reposts[i].embeddedReposts[rp].repostWitness);
            const repostState = RepostState.fromJSON(repostStateJSON) as RepostState;
            let calculatedRepostRoot = repostWitness.computeRootAndKeyV2(repostState.hash())[0].toString();
  
            // Audit that all roots calculated from the state of each repost and their witnesses, match zkApp state
            if (fetchedRepostsRoot !== calculatedRepostRoot) {
              throw new Error(`Repost ${repostStateJSON.allRepostsCounter} has different root than zkApp state.\
              The server may be experiencing some issues or manipulating results for the reposts to Post ${reposts[i].postState.allPostsCounter}
              from Repost ${reposts[i].repostState.allRepostsCounter}`);
            }
          }
        }
      };
    } catch (e: any) {
        console.log(e);
        setLoading(false);
        setErrorMessage(e.message);
    }
  };

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
      howManyPosts > 0 ? await fetchItems('posts') : null;
      howManyReposts > 0 ? await fetchItems('reposts') : null;
      setFetchCompleted(true);
    })();
  }, [getGlobalFeed]);

  useEffect(() => {
    if (!fetchCompleted) return;
    (async () => {
      if (posts.length > 0) {
        await auditPosts();    
        auditNoSkippingContentInPosts();
      }
      if (reposts.length > 0) {
        await auditReposts();
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