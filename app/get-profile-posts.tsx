import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import { getCID } from './utils/cid';
import ReactionButton from './reaction-button';
import CommentButton from './comment-button';
import { faComments, faRetweet } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import RepostButton from './repost-button';
import { EmbeddedReactions, ProcessedPosts, ProcessedReposts, EmbeddedComments, EmbeddedReposts } from './get-global-posts';
import DeletePostButton from './delete-post-button';
import DeleteRepostButton from './delete-repost-button';
import { CommentState, PostState, ReactionState, RepostState } from 'wrdhom';

export default function GetProfilePosts({
  getProfile,
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
  getProfile: boolean,
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
  const [triggerAudit1, setTriggerAudit1] = useState(false);
  const [triggerAudit2, setTriggerAudit2] = useState(false);
  const [whenZeroContent, setWhenZeroContent] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);

  const fetchPosts = async () => {
    try {
      setPosts([]);
      setReposts([]);
      setLoading(true);
      setErrorMessage(null);
      setWhenZeroContent(false);
      const response = await fetch(`/posts`+
        `?profileAddress=${profileAddress}`+
        `&howMany=${howManyPosts}`+
        `&fromBlock=${fromBlock}`+
        `&toBlock=${toBlock}`+
        `&currentUser=${account[0]}`,
        {
          headers: {'Cache-Control': 'no-cache'}
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: any = await response.json();

      if (data.postsResponse.length === 0) {
        return;
      }

      const processedPosts: ProcessedPosts[] = [];
      for (let i = 0; i < data.postsResponse.length; i++) {
        const postStateJSON = JSON.parse(data.postsResponse[i].postState);
        const shortPosterAddressEnd = postStateJSON.posterAddress.slice(-12);
        const allEmbeddedReactions: EmbeddedReactions[] = [];
        const filteredEmbeddedReactions: EmbeddedReactions[] = [];

        for (let r = 0; r < data.postsResponse[i].embeddedReactions.length; r++) {
          const reactionStateJSON = JSON.parse(data.postsResponse[i].embeddedReactions[r].reactionState);

          allEmbeddedReactions.push({
            reactionState: reactionStateJSON,
            reactionWitness: JSON.parse(data.postsResponse[i].embeddedReactions[r].reactionWitness),
            reactionEmoji: String.fromCodePoint(reactionStateJSON.reactionCodePoint)
          });

          if (Number(reactionStateJSON.deletionBlockHeight) === 0) {
            filteredEmbeddedReactions.push({
              reactionState: reactionStateJSON,
              reactionWitness: JSON.parse(data.postsResponse[i].embeddedReactions[r].reactionWitness),
              reactionEmoji: String.fromCodePoint(reactionStateJSON.reactionCodePoint),
            });
          }
        }

        const emojis = filteredEmbeddedReactions.map(reaction => reaction.reactionEmoji);
        const frequencyMap = new Map<string, number>();
        emojis.forEach(emoji => {
          const count = frequencyMap.get(emoji) || 0;
          frequencyMap.set(emoji, count + 1);
        });
        const sortedEmojis = Array.from(frequencyMap).sort((a, b) => b[1] - a[1]);
        const top3Emojis = sortedEmojis.slice(0, 3).map(item => item[0]);

        const embeddedComments: EmbeddedComments[] = [];
        let numberOfDeletedComments = 0;
        for (let c = 0; c < data.postsResponse[i].embeddedComments.length; c++) {
          const commentStateJSON = JSON.parse(data.postsResponse[i].embeddedComments[c].commentState);

          embeddedComments.push({
            commentState: commentStateJSON,
            commentWitness: JSON.parse(data.postsResponse[i].embeddedComments[c].commentWitness)
          });
          numberOfDeletedComments += Number(commentStateJSON.deletionBlockHeight) === 0 ? 0 : 1;
        }
        const numberOfNonDeletedComments = Number(data.postsResponse[i].numberOfComments) - numberOfDeletedComments;

        const embeddedReposts: EmbeddedReposts[] = [];
        let numberOfDeletedReposts = 0;
        for (let rp = 0; rp < data.postsResponse[i].embeddedReposts.length; rp++) {
          const repostStateJSON = JSON.parse(data.postsResponse[i].embeddedReposts[rp].repostState);

          embeddedReposts.push({
            repostState: repostStateJSON,
            repostWitness: JSON.parse(data.postsResponse[i].embeddedReposts[rp].repostWitness)
          });
          numberOfDeletedReposts += Number(repostStateJSON.deletionBlockHeight) === 0 ? 0 : 1;
        }
        const numberOfNonDeletedReposts = Number(data.postsResponse[i].numberOfReposts) - numberOfDeletedReposts;

        let currentUserRepostStateJSON: JSON | undefined;
        let currentUserRepostWitnessJSON: JSON | undefined;
        if (data.postsResponse[i].currentUserRepostState !== undefined && data.postsResponse[i].currentUserRepostWitness !== undefined) {
          currentUserRepostStateJSON = JSON.parse(data.postsResponse[i].currentUserRepostState);
          currentUserRepostWitnessJSON = JSON.parse(data.postsResponse[i].currentUserRepostWitness);
        }

        processedPosts.push({
          postState: postStateJSON,
          postWitness: JSON.parse(data.postsResponse[i].postWitness),
          postKey: data.postsResponse[i].postKey,
          postContentID: data.postsResponse[i].postContentID,
          content: data.postsResponse[i].content,
          shortPosterAddressEnd: shortPosterAddressEnd,
          allEmbeddedReactions: allEmbeddedReactions,
          filteredEmbeddedReactions: filteredEmbeddedReactions,
          top3Emojis: top3Emojis,
          numberOfReactions: data.postsResponse[i].numberOfReactions,
          numberOfReactionsWitness: JSON.parse(data.postsResponse[i].numberOfReactionsWitness),
          embeddedComments: embeddedComments,
          numberOfComments: data.postsResponse[i].numberOfComments,
          numberOfCommentsWitness: JSON.parse(data.postsResponse[i].numberOfCommentsWitness),
          numberOfNonDeletedComments: numberOfNonDeletedComments,
          embeddedReposts: embeddedReposts,
          numberOfReposts: data.postsResponse[i].numberOfReposts,
          numberOfRepostsWitness: JSON.parse(data.postsResponse[i].numberOfRepostsWitness),
          numberOfNonDeletedReposts: numberOfNonDeletedReposts,
          currentUserRepostState: currentUserRepostStateJSON,
          currentUserRepostKey: data.postsResponse[i].currentUserRepostKey,
          currentUserRepostWitness: currentUserRepostWitnessJSON
      });
      };

      setPosts(processedPosts);
    } catch (e: any) {
        console.log(e);
        setLoading(false);
        setErrorMessage(e.message);
    }
  };

  const auditPosts = async () => {
    try {
      // Remove post to cause a gap error
      // posts.splice(1, 1);

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
      // posts[1].allEmbeddedReactions.splice(1,1);

      for (let i = 0; i < posts.length; i++) {

        const postState = PostState.fromJSON(posts[i].postState) as PostState;
        const postWitness = MerkleMapWitness.fromJSON(posts[i].postWitness);
        let calculatedPostsRoot = postWitness.computeRootAndKey(postState.hash())[0].toString();

        // Introduce different root to cause a root mismatch
        /*if (i === 1) {
          calculatedPostsRoot = 'badRoot'
        }*/

        if (fetchedPostsRoot !== calculatedPostsRoot) {
          throw new Error(`User Post ${posts[i].postState.userPostsCounter} has different root than zkApp state. The server may be experiencing some issues or\
          manipulating results for your query.`);
        }

        if (Number(posts[i].postState.deletionBlockHeight) === 0) {
          const numberOfReactionsWitness = MerkleMapWitness.fromJSON(posts[i].numberOfReactionsWitness);
          const numberOfCommentsWitness = MerkleMapWitness.fromJSON(posts[i].numberOfCommentsWitness);
          const numberOfRepostsWitness = MerkleMapWitness.fromJSON(posts[i].numberOfRepostsWitness);
          let calculatedTargetsReactionsCountersRoot = numberOfReactionsWitness.computeRootAndKey(
            Field(posts[i].numberOfReactions))[0].toString();
          let calculatedTargetsCommentsCountersRoot = numberOfCommentsWitness.computeRootAndKey(
            Field(posts[i].numberOfComments))[0].toString();
          let calculatedTargetsRepostsCountersRoot = numberOfRepostsWitness.computeRootAndKey(
            Field(posts[i].numberOfReposts))[0].toString();
  
          // Introduce different block-length to cause block mismatch
          /*if (i === 0) {
            posts[i].postState.postBlockHeight = 10000000000;
          }*/
  
          // Introduce different content to cause content mismatch
          /*if (i === 1) {
            posts[i].content = 'wrong content';
          }*/
  
          // Audit that all posts come from the profile we are visiting
          if (profileAddress !== posts[i].postState.posterAddress) {
            throw new Error(`User Post ${posts[i].postState.userPostsCounter} comes from a wrong address. All posts should come from address: ${profileAddress}`);
          }
  
          // Audit that all posts are between the block range in the user query
          if (posts[i].postState.postBlockHeight < fromBlock ||  posts[i].postState.postBlockHeight > toBlock) {
            throw new Error(`Block-length ${posts[i].postState.postBlockHeight} for User Post ${posts[i].postState.userPostsCounter} isn't between the block range\
            ${fromBlock} to ${toBlock}`);
          }
  
          // Audit that the on-chain state matches the off-chain state
  
          if (fetchedTargetsReactionsCountersRoot !== calculatedTargetsReactionsCountersRoot ) {
            throw new Error(`Server stated that there are ${posts[i].numberOfReactions} reactions for User Post ${posts[i].postState.userPostsCounter},\
            but the contract accounts for a different amount. The server may be experiencing issues or manipulating responses.`);
          }
  
          if (fetchedTargetsCommentsCountersRoot !== calculatedTargetsCommentsCountersRoot) {
            throw new Error(`Server stated that there are ${posts[i].numberOfComments} comments for User Post ${posts[i].postState.userPostsCounter},\
            but the contract accounts for a different amount. The server may be experiencing issues or manipulating responses.`);
          }
  
          if (fetchedTargetsRepostsCountersRoot !== calculatedTargetsRepostsCountersRoot) {
            throw new Error(`Server stated that there are ${posts[i].numberOfReposts} reposts for User Post ${posts[i].postState.userPostsCounter},\
            but the contract accounts for a different amount. The server may be experiencing issues or manipulating responses.`);
          }
  
          // Audit that the content of posts matches the contentID signed by the author
          const cid = await getCID(posts[i].content);
          if (cid !== posts[i].postContentID) {
            throw new Error(`The content for User Post ${posts[i].postState.userPostsCounter} doesn't match the expected contentID. The server may be experiencing\
            some issues or manipulating the content it shows.`);
          }
  
          // Audit that the number of reactions the server retrieves, matches the number of reactions accounted on the zkApp state
          if(posts[i].allEmbeddedReactions.length !== posts[i].numberOfReactions) {
            throw new Error(`Server stated that there are ${posts[i].numberOfReactions} reactions for User Post ${posts[i].postState.userPostsCounter},\
            but it only provided ${posts[i].allEmbeddedReactions.length} reactions. The server may be experiencing some issues or manipulating
            the content it shows.`)
          }
  
          for (let r = 0; r < posts[i].allEmbeddedReactions.length; r++) {
            const reactionStateJSON = posts[i].allEmbeddedReactions[r].reactionState;
            const reactionWitness = MerkleMapWitness.fromJSON(posts[i].allEmbeddedReactions[r].reactionWitness);
            const reactionState = ReactionState.fromJSON(reactionStateJSON) as ReactionState;
            let calculatedReactionRoot = reactionWitness.computeRootAndKey(reactionState.hash())[0].toString();
  
            // Audit that all roots calculated from the state of each reaction and their witnesses, match zkApp state
            if (fetchedReactionsRoot !== calculatedReactionRoot) {
              throw new Error(`Reaction ${reactionStateJSON.allReactionsCounter} has different root than zkApp state.\
              The server may be experiencing some issues or manipulating results for the reactions to User Post ${posts[i].postState.userPostsCounter}.`);
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
            let calculatedCommentRoot = commentWitness.computeRootAndKey(commentState.hash())[0].toString();

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
            let calculatedRepostRoot = repostWitness.computeRootAndKey(repostState.hash())[0].toString();
  
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

  const fetchReposts = async () => {
    try {
      const response = await fetch(`/reposts`+
        `?reposterAddress=${profileAddress}`+
        `&howMany=${howManyReposts}`+
        `&fromBlock=${fromBlockReposts}`+
        `&toBlock=${toBlockReposts}`,
        {
          headers: {'Cache-Control': 'no-cache'}
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: any = await response.json();

      if (data.repostsResponse.length === 0) {
        return;
      }

      const processedReposts: ProcessedReposts[] = [];
      for (let i = 0; i < data.repostsResponse.length; i++) {
        const repostStateJSON = JSON.parse(data.repostsResponse[i].repostState);
        const postStateJSON = JSON.parse(data.repostsResponse[i].postState);
        const shortReposterAddressEnd = repostStateJSON.reposterAddress.slice(-12);
        const shortPosterAddressEnd = postStateJSON.posterAddress.slice(-12);
        const allEmbeddedReactions: EmbeddedReactions[] = [];
        const filteredEmbeddedReactions: EmbeddedReactions[] = [];

        for (let r = 0; r < data.repostsResponse[i].embeddedReactions.length; r++) {
          const reactionStateJSON = JSON.parse(data.repostsResponse[i].embeddedReactions[r].reactionState);

          allEmbeddedReactions.push({
            reactionState: reactionStateJSON,
            reactionWitness: JSON.parse(data.repostsResponse[i].embeddedReactions[r].reactionWitness),
            reactionEmoji: String.fromCodePoint(reactionStateJSON.reactionCodePoint),
          });

          if (Number(reactionStateJSON.deletionBlockHeight) === 0) {
            filteredEmbeddedReactions.push({
              reactionState: reactionStateJSON,
              reactionWitness: JSON.parse(data.repostsResponse[i].embeddedReactions[r].reactionWitness),
              reactionEmoji: String.fromCodePoint(reactionStateJSON.reactionCodePoint),
            });
          }
        }

        const emojis = filteredEmbeddedReactions.map(reaction => reaction.reactionEmoji);
        const frequencyMap = new Map<string, number>();
        emojis.forEach(emoji => {
          const count = frequencyMap.get(emoji) || 0;
          frequencyMap.set(emoji, count + 1);
        });
        const sortedEmojis = Array.from(frequencyMap).sort((a, b) => b[1] - a[1]);
        const top3Emojis = sortedEmojis.slice(0, 3).map(item => item[0]);

        const embeddedComments: EmbeddedComments[] = [];
        let numberOfDeletedComments = 0;
        for (let c = 0; c < data.repostsResponse[i].embeddedComments.length; c++) {
          const commentStateJSON = JSON.parse(data.repostsResponse[i].embeddedComments[c].commentState);

          embeddedComments.push({
            commentState: commentStateJSON,
            commentWitness: JSON.parse(data.repostsResponse[i].embeddedComments[c].commentWitness)
          });
          numberOfDeletedComments += Number(commentStateJSON.deletionBlockHeight) === 0 ? 0 : 1;
        }
        const numberOfNonDeletedComments = Number(data.repostsResponse[i].numberOfComments) - numberOfDeletedComments;

        const embeddedReposts: EmbeddedReposts[] = [];
        let numberOfDeletedReposts = 0;
        for (let rp = 0; rp < data.repostsResponse[i].embeddedReposts.length; rp++) {
          const repostStateJSON = JSON.parse(data.repostsResponse[i].embeddedReposts[rp].repostState);

          embeddedReposts.push({
            repostState: repostStateJSON,
            repostWitness: JSON.parse(data.repostsResponse[i].embeddedReposts[rp].repostWitness)
          });
          numberOfDeletedReposts += Number(repostStateJSON.deletionBlockHeight) === 0 ? 0 : 1;
        }
        const numberOfNonDeletedReposts = Number(data.repostsResponse[i].numberOfReposts) - numberOfDeletedReposts;

        processedReposts.push({
          repostState: repostStateJSON,
          repostWitness: JSON.parse(data.repostsResponse[i].repostWitness),
          repostKey: data.repostsResponse[i].repostKey,
          shortReposterAddressEnd: shortReposterAddressEnd,
          postState: postStateJSON,
          postWitness: JSON.parse(data.repostsResponse[i].postWitness),
          postKey: data.repostsResponse[i].postKey,
          postContentID: data.repostsResponse[i].postContentID,
          content: data.repostsResponse[i].content,
          shortPosterAddressEnd: shortPosterAddressEnd,
          allEmbeddedReactions: allEmbeddedReactions,
          filteredEmbeddedReactions: filteredEmbeddedReactions,
          top3Emojis: top3Emojis,
          numberOfReactions: data.repostsResponse[i].numberOfReactions,
          numberOfReactionsWitness: JSON.parse(data.repostsResponse[i].numberOfReactionsWitness),
          embeddedComments: embeddedComments,
          numberOfComments: data.repostsResponse[i].numberOfComments,
          numberOfCommentsWitness: JSON.parse(data.repostsResponse[i].numberOfCommentsWitness),
          numberOfNonDeletedComments: numberOfNonDeletedComments,
          embeddedReposts: embeddedReposts,
          numberOfReposts: data.repostsResponse[i].numberOfReposts,
          numberOfRepostsWitness: JSON.parse(data.repostsResponse[i].numberOfRepostsWitness),
          numberOfNonDeletedReposts: numberOfNonDeletedReposts
      });
      };

      setReposts(processedReposts);
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
        const repostState = RepostState.fromJSON(reposts[i].repostState) as RepostState;
        let calculatedRepostsRoot = repostWitness.computeRootAndKey(repostState.hash())[0].toString();

        // Introduce different root to cause a root mismatch
        /*if (i === 0) {
          calculatedRepostsRoot = 'badRoot'
        }*/

        if (fetchedRepostsRoot !== calculatedRepostsRoot) {
          throw new Error(`User Repost ${reposts[i].repostState.userRepostsCounter} has different root than zkApp state. The server may be experiencing some issues or\
          manipulating results for your query.`);
        }    

        if (Number(reposts[i].repostState.deletionBlockHeight) === 0) {
          const postWitness = MerkleMapWitness.fromJSON(reposts[i].postWitness);
          const numberOfReactionsWitness = MerkleMapWitness.fromJSON(reposts[i].numberOfReactionsWitness);
          const numberOfCommentsWitness = MerkleMapWitness.fromJSON(reposts[i].numberOfCommentsWitness);
          const numberOfRepostsWitness = MerkleMapWitness.fromJSON(reposts[i].numberOfRepostsWitness);
          const postState = PostState.fromJSON(reposts[i].postState) as PostState;
          let calculatedPostsRoot = postWitness.computeRootAndKey(postState.hash())[0].toString();
          let calculatedTargetsReactionsCountersRoot = numberOfReactionsWitness.computeRootAndKey(
            Field(reposts[i].numberOfReactions))[0].toString();
          let calculatedTargetsCommentsCountersRoot = numberOfCommentsWitness.computeRootAndKey(
            Field(reposts[i].numberOfComments))[0].toString();
          let calculatedTargetsRepostsCountersRoot = numberOfRepostsWitness.computeRootAndKey(
            Field(reposts[i].numberOfReposts))[0].toString();
  
          // Introduce different block-length to cause block mismatch
          /*if (i === 0) {
            reposts[i].repostState.repostBlockHeight = 10000000000;
          }*/
  
          // Introduce different content to cause content mismatch
          /*if (i === 0) {
            reposts[i].content = 'wrong content';
          }*/
  
          // Audit that all reposts come from the profile we are visiting
          if (profileAddress !== reposts[i].repostState.reposterAddress) {
            throw new Error(`User Repost ${reposts[i].repostState.userRepostsCounter} comes from the wrong address: ${reposts[i].repostState.reposterAddress}. All posts should come from address: ${profileAddress}`);
          }
  
          // Audit that all reposts are between the block range in the user query
          if (reposts[i].repostState.repostBlockHeight < fromBlockReposts ||  reposts[i].repostState.repostBlockHeight > toBlockReposts) {
            throw new Error(`Block-length ${reposts[i].repostState.repostBlockHeight} for User Repost ${reposts[i].repostState.userRepostsCounter} isn't between the block range\
            ${fromBlockReposts} to ${toBlockReposts}`);
          }
  
          // Audit that the on-chain state matches the off-chain state
  
          if (fetchedPostsRoot !== calculatedPostsRoot) {
            throw new Error(`Post ${reposts[i].postState.allPostsCounter} from User Repost ${reposts[i].repostState.userRepostsCounter} has different root than zkApp state.\
            The server may be experiencing some issues or manipulating results for your query.`);
          }
  
          if (fetchedTargetsReactionsCountersRoot !== calculatedTargetsReactionsCountersRoot ) {
            throw new Error(`Server stated that there are ${reposts[i].numberOfReactions} reactions for Post ${reposts[i].postState.allPostsCounter}\
            from User Repost ${reposts[i].repostState.userRepostsCounter} but the contract accounts for a different amount. The server may be experiencing issues or\
            manipulating responses.`);
          }
  
          if (fetchedTargetsCommentsCountersRoot !== calculatedTargetsCommentsCountersRoot) {
            throw new Error(`Server stated that there are ${reposts[i].numberOfComments} comments for Post ${reposts[i].postState.allPostsCounter}\
            from User Repost ${reposts[i].repostState.userRepostsCounter}, but the contract accounts for a different amount. The server may be experiencing issues or\
            manipulating responses.`);
          }
  
          if (fetchedTargetsRepostsCountersRoot !== calculatedTargetsRepostsCountersRoot) {
            throw new Error(`Server stated that there are ${reposts[i].numberOfReposts} reposts for Post ${reposts[i].postState.allPostsCounter}\
            from User Repost ${reposts[i].repostState.userRepostsCounter}, but the contract accounts for a different amount. The server may be experiencing issues or\
            manipulating responses.`);
          }
  
          // Audit that the content of the reposted posts matches the contentID signed by the post author
          const cid = await getCID(reposts[i].content);
          if (cid !== reposts[i].postContentID) {
            throw new Error(`The content for Post ${reposts[i].postState.allPostsCounter} from User Repost ${reposts[i].repostState.userRepostsCounter} doesn't match\
            the expected contentID. The server may be experiencing some issues or manipulating the content it shows.`);
          }
  
          // Audit that the number of reactions the server retrieves, matches the number of reactions accounted on the zkApp state
          if(reposts[i].allEmbeddedReactions.length !== reposts[i].numberOfReactions) {
            throw new Error(`Server stated that there are ${reposts[i].numberOfReactions} reactions for Post ${reposts[i].postState.allPostsCounter}\
            from User Repost ${reposts[i].repostState.userRepostsCounter} but it only provided ${reposts[i].allEmbeddedReactions.length} reactions. The server\
            may be experiencing some issues or manipulating the content it shows.`)
          }
  
          for (let r = 0; r < reposts[i].allEmbeddedReactions.length; r++) {
            const reactionStateJSON = reposts[i].allEmbeddedReactions[r].reactionState;
            const reactionWitness = MerkleMapWitness.fromJSON(reposts[i].allEmbeddedReactions[r].reactionWitness);
            const reactionState = ReactionState.fromJSON(reactionStateJSON) as ReactionState;
            let calculatedReactionRoot = reactionWitness.computeRootAndKey(reactionState.hash())[0].toString();
  
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
            let calculatedCommentRoot = commentWitness.computeRootAndKey(commentState.hash())[0].toString();
  
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
            let calculatedRepostRoot = repostWitness.computeRootAndKey(repostState.hash())[0].toString();

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
        if (Number(posts[i].postState.userPostsCounter) !== Number(posts[i+1].postState.userPostsCounter)+1) {
          throw new Error(`Gap between User Posts ${posts[i].postState.userPostsCounter} and ${posts[i+1].postState.userPostsCounter}.\
          The server may be experiencing some issues or censoring posts.`);
        }

        for (let r = 0; r < Number(posts[i].allEmbeddedReactions.length)-1; r++) {
          if (Number(posts[i].allEmbeddedReactions[r].reactionState.targetReactionsCounter)
          !== Number(posts[i].allEmbeddedReactions[r+1].reactionState.targetReactionsCounter)+1) {
            throw new Error(`Gap between Reactions ${posts[i].allEmbeddedReactions[r].reactionState.targetReactionsCounter} and\
            ${posts[i].allEmbeddedReactions[r+1].reactionState.targetReactionsCounter}, from User Post ${posts[i].postState.userPostsCounter}\
            The server may be experiencing some issues or censoring embedded reactions.`);
          }
        }

        for (let c = 0; c < Number(posts[i].embeddedComments.length)-1; c++) {
          if (Number(posts[i].embeddedComments[c].commentState.targetCommentsCounter)
          !== Number(posts[i].embeddedComments[c+1].commentState.targetCommentsCounter)+1) {
            throw new Error(`Gap between Comments ${posts[i].embeddedComments[c].commentState.targetCommentsCounter} and\
            ${posts[i].embeddedComments[c+1].commentState.targetCommentsCounter}, from User Post ${posts[i].postState.userPostsCounter}\
            The server may be experiencing some issues or censoring embedded comments.`);
          }
        }

        for (let rp = 0; rp < Number(posts[i].embeddedReposts.length)-1; rp++) {
          if (Number(posts[i].embeddedReposts[rp].repostState.targetRepostsCounter)
          !== Number(posts[i].embeddedReposts[rp+1].repostState.targetRepostsCounter)+1) {
            throw new Error(`Gap between Reposts ${posts[i].embeddedReposts[rp].repostState.targetRepostsCounter} and\
            ${posts[i].embeddedReposts[rp+1].repostState.targetRepostsCounter}, from User Post ${posts[i].postState.userPostsCounter}\
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
        if (Number(reposts[i].repostState.userRepostsCounter) !== Number(reposts[i+1].repostState.userRepostsCounter)+1) {
          throw new Error(`Gap between User Reposts ${reposts[i].repostState.userRepostsCounter} and ${reposts[i+1].repostState.userRepostsCounter}.\
          The server may be experiencing some issues or censoring reposts.`);
        }

        for (let r = 0; r < Number(reposts[i].allEmbeddedReactions.length)-1; r++) {
          if (Number(reposts[i].allEmbeddedReactions[r].reactionState.targetReactionsCounter)
          !== Number(reposts[i].allEmbeddedReactions[r+1].reactionState.targetReactionsCounter)+1) {
            throw new Error(`Gap between Reactions ${reposts[i].allEmbeddedReactions[r].reactionState.targetReactionsCounter} and\
            ${reposts[i].allEmbeddedReactions[r+1].reactionState.targetReactionsCounter} from User Repost ${reposts[i].repostState.userRepostsCounter}\
            The server may be experiencing some issues or censoring embedded reactions.`);
          }
        }

        for (let c = 0; c < Number(posts[i].embeddedComments.length)-1; c++) {
          if (Number(reposts[i].embeddedComments[c].commentState.targetCommentsCounter)
          !== Number(reposts[i].embeddedComments[c+1].commentState.targetCommentsCounter)+1) {
            throw new Error(`Gap between Comments ${reposts[i].embeddedComments[c].commentState.targetCommentsCounter} and\
            ${reposts[i].embeddedComments[c+1].commentState.targetCommentsCounter}, from User Repost ${reposts[i].repostState.userPostsCounter}\
            The server may be experiencing some issues or censoring embedded comments.`);
          }
        }

        for (let rp = 0; rp < Number(reposts[i].embeddedReposts.length)-1; rp++) {
          if (Number(reposts[i].embeddedReposts[rp].repostState.targetRepostsCounter)
          !== Number(reposts[i].embeddedReposts[rp+1].repostState.targetRepostsCounter)+1) {
            throw new Error(`Gap between Reposts ${reposts[i].embeddedReposts[rp].repostState.targetRepostsCounter} and\
            ${reposts[i].embeddedReposts[rp+1].repostState.targetRepostsCounter}, from User Repost ${reposts[i].repostState.userPostsCounter}\
            The server may be experiencing some issues or censoring embedded reposts.`);
          }
        }
      }
    } catch (e: any) {
        console.log(e);
        setErrorMessage(e.message);
    }
  }


  const goBack = () => {
    setShowProfile(false);
    setProfileAddress('');
    setCommentTarget(null);
    setHideGetGlobalPosts('');
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
    if (sorted.length === 0 && firstLoad === false) {
      setWhenZeroContent(true);
    }
    if (firstLoad === true) {
      setFirstLoad(false);
    } else {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await fetchPosts();
      await fetchReposts();
      setTriggerAudit1(!triggerAudit1);
    })();
  }, [getProfile, profileAddress]);

  useEffect(() => {
    (async () => {
      await auditPosts();
      await auditReposts();
      setTriggerAudit2(!triggerAudit2);
    })();
  }, [triggerAudit1]);

  useEffect(() => {
    auditNoSkippingContentInPosts();
    auditNoSkippingContentInReposts();
    mergeAndSortContent();
  }, [triggerAudit2]);

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
      {!loading && Array.isArray(mergedContent) && mergedContent.map((post) => {
        return (
            <div key={post.repostKey === undefined ? post.postKey : post.repostKey} className="p-2 border-b-2 shadow-lg">
                {
                  post.repostState === undefined ? null :
                  <div className="flex flex-row">
                    <div
                      className="text-xs text-stone-400 mt-1"
                      onMouseEnter={() => setSelectedProfileAddress(post.repostState.reposterAddress)}
                      onClick={() => setProfileAddress(selectedProfileAddress)}
                    >
                    <span className="cursor-pointer hover:underline">{post.shortReposterAddressEnd}</span> 
                    {` reposted at block ${post.repostState.repostBlockHeight} (User Repost:${post.repostState.userRepostsCounter})`}
                    </div>
                  </div>
                }
                <div className="flex items-center border-4 p-2 shadow-lg text-xs text-white bg-black">
                  <span 
                    className="mr-2 cursor-pointer hover:underline"
                    onMouseEnter={() => setSelectedProfileAddress(post.postState.posterAddress)}
                    onClick={() => setProfileAddress(selectedProfileAddress)}
                    >
                      <p className="mr-8">{post.shortPosterAddressEnd}</p>
                    </span>
                    <p className="mr-4">{post.repostState === undefined ? 'User Post:' + post.postState.userPostsCounter
                      : 'Post:' + post.postState.allPostsCounter}
                    </p>
                    <div className="flex-grow"></div>
                    <p className="mr-1">{'Block:' + post.postState.postBlockHeight}</p>
                </div>
                <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-normal overflow-wrap">
                    <p>{post.content}</p>
                </div>
                <div className="flex flex-row">
                  {post.top3Emojis.map((emoji: string) => emoji)}
                  <p className="text-xs ml-1 mt-2">{post.filteredEmbeddedReactions.length > 0 ? post.filteredEmbeddedReactions.length : null}</p>
                  {post.numberOfNonDeletedComments > 0 ? <button
                  className="hover:text-lg ml-3"
                  onClick={() => setCommentTarget(post)}
                  >
                    <FontAwesomeIcon icon={faComments} />
                  </button> : null}
                  <p className="text-xs ml-1 mt-2">{post.numberOfNonDeletedComments > 0 ? post.numberOfNonDeletedComments : null}</p>
                  {post.numberOfNonDeletedReposts > 0 ? <div className="ml-3"><FontAwesomeIcon icon={faRetweet} /></div> : null}
                  <p className="text-xs ml-1 mt-2">{post.numberOfNonDeletedReposts > 0 ? post.numberOfNonDeletedReposts : null}</p>
                  <div className="flex-grow"></div>
                  {walletConnected && <ReactionButton
                    targetKey={post.postKey}
                    embeddedReactions={post.filteredEmbeddedReactions}
                    account={account[0]}
                  />}
                  {walletConnected && <CommentButton
                    targetKey={post.postKey}
                  />}
                  {post.repostKey === undefined && post.currentUserRepostState === undefined
                    ?
                      walletConnected && <RepostButton targetKey={post.postKey}/>
                    :
                      post.repostState !== undefined &&
                      post.repostState.reposterAddress !== undefined &&
                      account[0] === post.repostState.reposterAddress
                    ?
                      <DeleteRepostButton
                        repostTargetKey={post.postKey}
                        repostState={post.repostState}
                        repostKey={post.repostKey}
                      />
                    :
                      post.currentUserRepostState !== undefined &&
                      post.currentUserRepostState.reposterAddress !== undefined &&
                      account[0] === post.currentUserRepostState.reposterAddress
                    ?
                      <DeleteRepostButton
                        repostTargetKey={post.postKey}
                        repostState={post.currentUserRepostState}
                        repostKey={post.currentUserRepostKey}
                      />
                    :
                      null
                  }
                  {account[0] === post.postState.posterAddress ?
                    <DeletePostButton
                      postState={post.postState}
                      postKey={post.postKey}  
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
  );
};