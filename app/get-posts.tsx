import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import { getCID } from './utils/cid';
import ReactionButton from './reaction-button';
import CommentButton from './comment-button';
import { faComments, faRetweet } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import RepostButton from './repost-button';
import CreatePost from './create-post';

export default function GetPosts({
  getPosts,
  howManyPosts,
  fromBlock,
  toBlock,
  setProfileAddress,
  hideGetPosts,
  walletConnected,
  setCommentTarget,
  howManyReposts,
  fromBlockReposts,
  toBlockReposts,
  postsContractAddress,
  reactionsContractAddress,
  commentsContractAddress,
  repostsContractAddress
}: {
  getPosts: boolean,
  howManyPosts: number,
  fromBlock: number,
  toBlock: number,
  setProfileAddress: Dispatch<SetStateAction<string>>,
  hideGetPosts: string,
  walletConnected: boolean,
  setCommentTarget: Dispatch<SetStateAction<any>>,
  howManyReposts: number,
  fromBlockReposts: number,
  toBlockReposts: number,
  postsContractAddress: string,
  reactionsContractAddress: string,
  commentsContractAddress: string,
  repostsContractAddress: string
}) {
  const [posts, setPosts] = useState([] as any[]);
  const [reposts, setReposts] = useState([] as any[]);
  const [mergedContent, setMergedContent] = useState([] as any);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
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
        `?howMany=${howManyPosts}`+
        `&fromBlock=${fromBlock}`+
        `&toBlock=${toBlock}`,
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
        const processedReactions: ProcessedReactions[] = [];

        for (let r = 0; r < data.postsResponse[i].reactionsResponse.length; r++) {
          const reactionStateJSON = JSON.parse(data.postsResponse[i].reactionsResponse[r].reactionState);

          processedReactions.push({
            reactionState: reactionStateJSON,
            reactionWitness: JSON.parse(data.postsResponse[i].reactionsResponse[r].reactionWitness),
            reactionEmoji: String.fromCodePoint(reactionStateJSON.reactionCodePoint)
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

        processedPosts.push({
            postState: postStateJSON,
            postWitness: JSON.parse(data.postsResponse[i].postWitness),
            postKey: data.postsResponse[i].postKey,
            postContentID: data.postsResponse[i].postContentID,
            content: data.postsResponse[i].content,
            shortPosterAddressEnd: shortPosterAddressEnd,
            processedReactions: processedReactions,
            top3Emojis: top3Emojis,
            numberOfReactions: data.postsResponse[i].numberOfReactions,
            numberOfReactionsWitness: JSON.parse(data.postsResponse[i].numberOfReactionsWitness),
            numberOfComments: data.postsResponse[i].numberOfComments,
            numberOfCommentsWitness: JSON.parse(data.postsResponse[i].numberOfCommentsWitness),
            numberOfReposts: data.postsResponse[i].numberOfReposts,
            numberOfRepostsWitness: JSON.parse(data.postsResponse[i].numberOfRepostsWitness)
        });
      };

      setPosts(processedPosts);

    } catch (e: any) {
        setLoading(false);
        setErrorMessage(e.message);
    }
  };

  const auditPosts = async () => {
    try {
      // Remove post to cause a gap error
      // posts.splice(1, 1);

      const { MerkleMapWitness, fetchAccount, Field } = await import('o1js');
      const { PostState, ReactionState } = await import('wrdhom');

      const postsContractData = await fetchAccount({
        publicKey: postsContractAddress
      }, '/graphql');
      const fetchedAllPostsCounter = postsContractData.account?.zkapp?.appState[0].toString();
      //console.log('fetchedAllPostsCounter: ' + fetchedAllPostsCounter);
      const fetchedPostsRoot = postsContractData.account?.zkapp?.appState[2].toString();
      //console.log('fetchedPostsRoot: ' + fetchedPostsRoot);

      const reactionsContractData = await fetchAccount({
        publicKey: reactionsContractAddress
      }, '/graphql');
      const fetchedTargetsReactionsCountersRoot = reactionsContractData.account?.zkapp?.appState[2].toString();
      //console.log('fetchedTargetsReactionsCountersRoot: ' + fetchedTargetsReactionsCountersRoot);
      const fetchedReactionsRoot = reactionsContractData.account?.zkapp?.appState[3].toString();
      //console.log('fetchedReactionsRoot: ' + fetchedReactionsRoot);

      const commentsContractData = await fetchAccount({
        publicKey: commentsContractAddress
      }, '/graphql');
      const fetchedTargetsCommentsCountersRoot = commentsContractData.account?.zkapp?.appState[2].toString();
      //console.log('fetchedTargetsCommentsCountersRoot: ' + fetchedTargetsCommentsCountersRoot);

      const repostsContractData = await fetchAccount({
        publicKey: repostsContractAddress
      }, '/graphql');
      const fetchedTargetsRepostsCountersRoot = repostsContractData.account?.zkapp?.appState[2].toString();
      //console.log('fetchedTargetsRepostsCountersRoot: ' + fetchedTargetsRepostsCountersRoot);

      // Remove reaction to cause a gap error
      // posts[4].processedReactions.splice(1, 1);

      console.log(posts)

      for (let i = 0; i < posts.length; i++) {
        console.log('post' + i)
        const postWitness = MerkleMapWitness.fromJSON(posts[i].postWitness);
        const numberOfReactionsWitness = MerkleMapWitness.fromJSON(posts[i].numberOfReactionsWitness);
        const numberOfCommentsWitness = MerkleMapWitness.fromJSON(posts[i].numberOfCommentsWitness);
        const numberOfRepostsWitness = MerkleMapWitness.fromJSON(posts[i].numberOfRepostsWitness);
        const postState = PostState.fromJSON(posts[i].postState);
        let calculatedPostsRoot = postWitness.computeRootAndKey(postState.hash())[0].toString();
        //console.log('calculatedPostsRoot: ' + calculatedPostsRoot);
        let calculatedTargetsReactionsCountersRoot = numberOfReactionsWitness.computeRootAndKey(
          Field(posts[i].numberOfReactions))[0].toString();
        //console.log('calculatedTargetsReactionsCountersRoot: ' + calculatedTargetsReactionsCountersRoot);
        let calculatedTargetsCommentsCountersRoot = numberOfCommentsWitness.computeRootAndKey(
          Field(posts[i].numberOfComments))[0].toString();
        //console.log('calculatedTargetsCommentsCountersRoot: ' + calculatedTargetsCommentsCountersRoot);
        let calculatedTargetsRepostsCountersRoot = numberOfRepostsWitness.computeRootAndKey(
          Field(posts[i].numberOfReposts))[0].toString();
        //console.log('calculatedTargetsRepostsCountersRoot: ' + calculatedTargetsRepostsCountersRoot);
        const processedReactions: ProcessedReactions[] = [];

        // Introduce different root to cause a root mismatch
        /*if (i === 0) {
          calculatedPostsRoot = 'badRoot'
        }*/

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

        if (fetchedPostsRoot !== calculatedPostsRoot) {
          throw new Error(`Post ${posts[i].postState.allPostsCounter} has different root than zkApp state. The server may be experiencing some issues or\
          manipulating results for your query.`);
        }

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
        if(posts[i].processedReactions.length !== posts[i].numberOfReactions) {
          throw new Error(`Server stated that there are ${posts[i].numberOfReactions} reactions for post ${posts[i].postState.allPostsCounter},\
          but it only provided ${posts[i].processedReactions.length} reactions. The server may be experiencing some issues or manipulating
          the content it shows.`)
        }

        for (let r = 0; r < posts[i].processedReactions.length; r++) {
          const reactionStateJSON = posts[i].processedReactions[r].reactionState;
          const reactionWitness = MerkleMapWitness.fromJSON(posts[i].processedReactions[r].reactionWitness);
          const reactionState = ReactionState.fromJSON(reactionStateJSON);
          let calculatedReactionRoot = reactionWitness.computeRootAndKey(reactionState.hash())[0].toString();
          //console.log('calculatedReactionRoot: ' + calculatedReactionRoot);

          // Audit that all roots calculated from the state of each reaction and their witnesses, match zkApp state
          if (fetchedReactionsRoot !== calculatedReactionRoot) {
            throw new Error(`Reaction ${reactionStateJSON.allReactionsCounter} has different root than zkApp state.\
            The server may be experiencing some issues or manipulating results for the reactions to Post ${posts[i].postState.allPostsCounter}.`);
          }
        }
      };
    } catch (e: any) {
        setLoading(false);
        setErrorMessage(e.message);
    }
  };

  const fetchReposts = async () => {
    try {
      const response = await fetch(`/reposts`+
        `?howMany=${howManyReposts}`+
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
        const processedReactions: ProcessedReactions[] = [];

        for (let r = 0; r < data.repostsResponse[i].reactionsResponse.length; r++) {
          const reactionStateJSON = JSON.parse(data.repostsResponse[i].reactionsResponse[r].reactionState);

          processedReactions.push({
            reactionState: reactionStateJSON,
            reactionWitness: JSON.parse(data.repostsResponse[i].reactionsResponse[r].reactionWitness),
            reactionEmoji: String.fromCodePoint(reactionStateJSON.reactionCodePoint),
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
            processedReactions: processedReactions,
            top3Emojis: top3Emojis,
            numberOfReactions: data.repostsResponse[i].numberOfReactions,
            numberOfReactionsWitness: JSON.parse(data.repostsResponse[i].numberOfReactionsWitness),
            numberOfComments: data.repostsResponse[i].numberOfComments,
            numberOfCommentsWitness: JSON.parse(data.repostsResponse[i].numberOfCommentsWitness),
            numberOfReposts: data.repostsResponse[i].numberOfReposts,
            numberOfRepostsWitness: JSON.parse(data.repostsResponse[i].numberOfRepostsWitness),
        });
      };

      setReposts(processedReposts);

    } catch (e: any) {
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
      const { PostState, ReactionState, RepostState } = await import('wrdhom');

      const postsContractData = await fetchAccount({
        publicKey: postsContractAddress
      }, '/graphql');
      const fetchedPostsRoot = postsContractData.account?.zkapp?.appState[2].toString();
      //console.log('fetchedPostsRoot: ' + fetchedPostsRoot);

      const reactionsContractData = await fetchAccount({
        publicKey: reactionsContractAddress
      }, '/graphql');
      const fetchedTargetsReactionsCountersRoot = reactionsContractData.account?.zkapp?.appState[2].toString();
      //console.log('fetchedTargetsReactionsCountersRoot: ' + fetchedTargetsReactionsCountersRoot);
      const fetchedReactionsRoot = reactionsContractData.account?.zkapp?.appState[3].toString();
      //console.log('fetchedReactionsRoot: ' + fetchedReactionsRoot);

      const commentsContractData = await fetchAccount({
        publicKey: commentsContractAddress
      }, '/graphql');
      const fetchedTargetsCommentsCountersRoot = commentsContractData.account?.zkapp?.appState[2].toString();
      //console.log('fetchedTargetsCommentsCountersRoot: ' + fetchedTargetsCommentsCountersRoot);

      const repostsContractData = await fetchAccount({
        publicKey: repostsContractAddress
      }, '/graphql');
      const fetchedAllRepostsCounter = repostsContractData.account?.zkapp?.appState[0].toString();
      //console.log('fetchedAllRepostsCounter: ' + fetchedAllRepostsCounter);
      const fetchedTargetsRepostsCountersRoot = repostsContractData.account?.zkapp?.appState[2].toString();
      //console.log('fetchedTargetsRepostsCountersRoot: ' + fetchedTargetsRepostsCountersRoot);
      const fetchedRepostsRoot = repostsContractData.account?.zkapp?.appState[3].toString();
      //console.log('fetchedRepostsRoot: ' + fetchedRepostsRoot);

      // Remove reaction to cause a gap error
      // reposts[2].processedReactions.splice(1, 1);

      console.log(reposts);

      for (let i = 0; i < reposts.length; i++) {
        console.log('repost' + i)
        const repostWitness = MerkleMapWitness.fromJSON(reposts[i].repostWitness);
        const postWitness = MerkleMapWitness.fromJSON(reposts[i].postWitness);
        const numberOfReactionsWitness = MerkleMapWitness.fromJSON(reposts[i].numberOfReactionsWitness);
        const numberOfCommentsWitness = MerkleMapWitness.fromJSON(reposts[i].numberOfCommentsWitness);
        const numberOfRepostsWitness = MerkleMapWitness.fromJSON(reposts[i].numberOfRepostsWitness);
        const repostState = RepostState.fromJSON(reposts[i].repostState);
        const postState = PostState.fromJSON(reposts[i].postState);
        let calculatedRepostsRoot = repostWitness.computeRootAndKey(repostState.hash())[0].toString();
        //console.log('calculatedRepostsRoot: ' + calculatedRepostsRoot);
        let calculatedPostsRoot = postWitness.computeRootAndKey(postState.hash())[0].toString();
        //console.log('calculatedPostsRoot: ' + calculatedPostsRoot);
        let calculatedTargetsReactionsCountersRoot = numberOfReactionsWitness.computeRootAndKey(
          Field(reposts[i].numberOfReactions))[0].toString();
        //console.log('calculatedTargetsReactionsCountersRoot: ' + calculatedTargetsReactionsCountersRoot);
        let calculatedTargetsCommentsCountersRoot = numberOfCommentsWitness.computeRootAndKey(
          Field(reposts[i].numberOfComments))[0].toString();
        //console.log('calculatedTargetsCommentsCountersRoot: ' + calculatedTargetsCommentsCountersRoot);
        let calculatedTargetsRepostsCountersRoot = numberOfRepostsWitness.computeRootAndKey(
          Field(reposts[i].numberOfReposts))[0].toString();
        //console.log('calculatedTargetsRepostsCountersRoot: ' + calculatedTargetsRepostsCountersRoot);
        const processedReactions: ProcessedReactions[] = [];

        // Introduce different root to cause a root mismatch
        /*if (i === 0) {
          calculatedRepostsRoot = 'badRoot'
        }*/

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

        if (fetchedRepostsRoot !== calculatedRepostsRoot) {
          throw new Error(`Repost ${reposts[i].repostState.allRepostsCounter} has different root than zkApp state. The server may be experiencing some issues or\
          manipulating results for your query.`);
        }    

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
        if(reposts[i].processedReactions.length !== reposts[i].numberOfReactions) {
          throw new Error(`Server stated that there are ${reposts[i].numberOfReactions} reactions for Post ${reposts[i].postState.allPostsCounter}\
          from Repost ${reposts[i].repostState.allRepostsCounter} but it only provided ${reposts[i].processedReactions.length} reactions. The server\
          may be experiencing some issues or manipulating the content it shows.`)
        }

        for (let r = 0; r < reposts[i].processedReactions.length; r++) {
          const reactionStateJSON = reposts[i].processedReactions[r].reactionState;
          const reactionWitness = MerkleMapWitness.fromJSON(reposts[i].processedReactions[r].reactionWitness);
          const reactionState = ReactionState.fromJSON(reactionStateJSON);
          let calculatedReactionRoot = reactionWitness.computeRootAndKey(reactionState.hash())[0].toString();
          //console.log('calculatedReactionRoot: ' + calculatedReactionRoot);

          // Audit that all roots calculated from the state of each reaction and their witnesses, match zkApp state
          if (fetchedReactionsRoot !== calculatedReactionRoot) {
            throw new Error(`Reaction ${reactionStateJSON.allReactionsCounter} has different root than zkApp state.\
            The server may be experiencing some issues or manipulating results for the reactions to Post ${reposts[i].postState.allPostsCounter}.`);
          }
        }
      };
    } catch (e: any) {
        setLoading(false);
        setErrorMessage(e.message);
    }
  };

  const auditNoMissingPosts = () => {
    try {
      for (let i = 0; i < posts.length-1; i++) {
        if (Number(posts[i].postState.allPostsCounter) !== Number(posts[i+1].postState.allPostsCounter)+1) {
          throw new Error(`Gap between Posts ${posts[i].postState.allPostsCounter} and ${posts[i+1].postState.allPostsCounter}.\
          The server may be experiencing some issues or censoring posts.`);
        }

        for (let r = 0; r < Number(posts[i].processedReactions.length)-1; r++) {
          if (Number(posts[i].processedReactions[r].reactionState.targetReactionsCounter)
          !== Number(posts[i].processedReactions[r+1].reactionState.targetReactionsCounter)+1) {
            throw new Error(`Gap between Reactions ${posts[i].processedReactions[r].reactionState.targetReactionsCounter} and\
            ${posts[i].processedReactions[r+1].reactionState.targetReactionsCounter}, from Post ${posts[i].postState.allPostsCounter}\
            The server may be experiencing some issues or censoring reactions.`);
          }
        }
      }
    } catch (e: any) {
        setLoading(false);
        setErrorMessage(e.message);
    }
  }

  const auditNoMissingReposts = () => {
    try {
      for (let i = 0; i < reposts.length-1; i++) {
        if (Number(reposts[i].repostState.allRepostsCounter) !== Number(reposts[i+1].repostState.allRepostsCounter)+1) {
          throw new Error(`Gap between Reposts ${reposts[i].repostState.allRepostsCounter} and ${reposts[i+1].repostState.allRepostsCounter}.\
          The server may be experiencing some issues or censoring reposts.`);
        }

        for (let r = 0; r < Number(reposts[i].processedReactions.length)-1; r++) {
          if (Number(reposts[i].processedReactions[r].reactionState.targetReactionsCounter)
          !== Number(reposts[i].processedReactions[r+1].reactionState.targetReactionsCounter)+1) {
            throw new Error(`Gap between Reactions ${reposts[i].processedReactions[r].reactionState.targetReactionsCounter} and\
            ${reposts[i].processedReactions[r+1].reactionState.targetReactionsCounter} from Repost ${reposts[i].repostState.allRepostsCounter}\
            The server may be experiencing some issues or censoring reactions.`);
          }
        }
      }
    } catch (e: any) {
        setLoading(false);
        setErrorMessage(e.message);
    }
  }

  const mergeAndSortContent = () => {
    const merged = [...posts, ...reposts];
    const sortedAndMerged = merged.sort((a,b) => {
        const blockHeightA =  a.repostState === undefined ? a.postState.postBlockHeight : a.repostState.repostBlockHeight;
        const blockHeightB =  b.repostState === undefined ? b.postState.postBlockHeight : b.repostState.repostBlockHeight;
        return blockHeightB - blockHeightA;
    });
    setMergedContent(sortedAndMerged);
    if (sortedAndMerged.length === 0 && firstLoad === false) {
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
  }, [getPosts]);

  useEffect(() => {
    (async () => {
      await auditPosts();
      await auditReposts();
      setTriggerAudit2(!triggerAudit2);
    })();
  }, [triggerAudit1]);

  useEffect(() => {
    auditNoMissingPosts();
    auditNoMissingReposts();
    mergeAndSortContent();
  }, [triggerAudit2]);

  return (
    <div className={`w-3/5 p-4 overflow-y-auto max-h-[100vh] ${hideGetPosts}`}>
      {loading ? null : walletConnected && <CreatePost />}
      {loading && <p className="border-4 p-2 shadow-lg">Loading...</p>}
      {errorMessage && <p className="border-4 p-2 shadow-lg break-normal overflow-wrap">Error: {errorMessage}</p>}
      {!loading && Array.isArray(mergedContent) && mergedContent.map((post) => {
        return (
            <div key={post.repostKey === undefined ? post.postKey : post.repostKey} className="p-2 border-b-2 shadow-lg">
                {post.repostState === undefined ? null :
                <div
                  className="text-xs text-stone-400"
                  onMouseEnter={() => setSelectedProfileAddress(post.repostState.reposterAddress)}
                  onClick={() => setProfileAddress(selectedProfileAddress)}
                >
                 <span className="cursor-pointer hover:underline">{post.shortReposterAddressEnd}</span> 
                  {` reposted at block ${post.repostState.repostBlockHeight} (Repost:${post.repostState.allRepostsCounter})`}
                </div>}
                <div className="flex items-center border-4 p-2 shadow-lg text-xs text-white bg-black">
                  <span 
                    className="mr-2 cursor-pointer hover:underline"
                    onMouseEnter={() => setSelectedProfileAddress(post.postState.posterAddress)}
                    onClick={() => setProfileAddress(selectedProfileAddress)}
                    >
                      <p className="mr-8">{post.shortPosterAddressEnd}</p>
                    </span>
                  <p className="mr-4">{'Post:' + post.postState.allPostsCounter}</p>
                  <div className="flex-grow"></div>
                  <p className="mr-1">{'Block:' + post.postState.postBlockHeight}</p>
                </div>
                <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-normal overflow-wrap">
                    <p>{post.content}</p>
                </div>
                <div className="flex flex-row">
                  {post.top3Emojis.map((emoji: string) => emoji)}
                  <p className="text-xs ml-1 mt-2">{post.numberOfReactions > 0 ? post.numberOfReactions : null}</p>
                  {post.numberOfComments > 0 ? <button
                  className="hover:text-lg ml-3"
                  onClick={() => setCommentTarget(post)}
                  >
                    <FontAwesomeIcon icon={faComments} />
                  </button> : null}
                  <p className="text-xs ml-1 mt-2">{post.numberOfComments > 0 ? post.numberOfComments : null}</p>
                  {post.numberOfReposts > 0 ? <div className="ml-3"><FontAwesomeIcon icon={faRetweet} /></div> : null}
                  <p className="text-xs ml-1 mt-2">{post.numberOfReposts > 0 ? post.numberOfReposts : null}</p>
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
      {!loading && whenZeroContent && <div className="p-2 border-b-2 shadow-lg">
        <div className="flex items-center border-4 p-2 shadow-lg whitespace-pre-wrap break-normal overflow-wrap">
            <p >The query threw zero results</p>
        </div>
      </div>}
    </div>
  );
};

export type ProcessedReactions = {
  reactionState: JSON,
  reactionWitness: JSON,
  reactionEmoji: string
};

export type ProcessedPosts = {
  postState: JSON,
  postWitness: JSON,
  postKey: string,
  postContentID: string,
  content: string,
  shortPosterAddressEnd: string,
  processedReactions: ProcessedReactions[],
  top3Emojis: string[],
  numberOfReactions: number,
  numberOfReactionsWitness: JSON,
  numberOfComments: number,
  numberOfCommentsWitness: JSON,
  numberOfReposts: number,
  numberOfRepostsWitness: JSON
};

export type ProcessedReposts = {
  repostState: JSON,
  repostWitness: JSON,
  repostKey: string,
  shortReposterAddressEnd: string,
  postState: JSON,
  postWitness: JSON,
  postKey: string,
  postContentID: string,
  content: string,
  shortPosterAddressEnd: string,
  processedReactions: ProcessedReactions[],
  top3Emojis: string[],
  numberOfReactions: number,
  numberOfReactionsWitness: JSON,
  numberOfComments: number,
  numberOfCommentsWitness: JSON,
  numberOfReposts: number,
  numberOfRepostsWitness: JSON
};