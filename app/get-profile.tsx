import { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from "react";
import { getCID } from './utils/cid';
import ReactionButton from './reaction-button';
import CommentButton from './comment-button';
import { faComments, faRetweet } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import RepostButton from './repost-button';
import { ProcessedReactions, ProcessedPosts, ProcessedReposts } from './get-posts';

export default function GetProfile({
  getProfile,
  profileAddress,
  setProfileAddress,
  howManyPosts,
  fromBlock,
  toBlock,
  setShowProfile,
  setHideGetPosts,
  walletConnected,
  setCommentTarget,
  howManyReposts,
  fromBlockReposts,
  toBlockReposts,
}: {
  getProfile: boolean,
  profileAddress: string,
  setProfileAddress: Dispatch<SetStateAction<string>>,
  howManyPosts: number,
  fromBlock: number,
  toBlock: number,
  setShowProfile: Dispatch<SetStateAction<boolean>>,
  setHideGetPosts: Dispatch<SetStateAction<string>>,
  walletConnected: boolean,
  setCommentTarget: Dispatch<SetStateAction<any>>,
  howManyReposts: number,
  fromBlockReposts: number,
  toBlockReposts: number,
}) {
  const [posts, setPosts] = useState([] as any[]);
  const [reposts, setReposts] = useState([] as any[]);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState('');
  const [mergedContent, setMergedContent] = useState([] as any);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [triggerAudit, setTriggerAudit] = useState(false);
  const [whenZeroContent, setWhenZeroContent] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);

  const fetchPosts = async () => {
    try {
      setPosts([]);
      setReposts([]);
      setLoading(true);
      setErrorMessage(null);
      setWarningMessage(null);
      setWhenZeroContent(false);
      const response = await fetch(`/posts`+
        `?posterAddress=${profileAddress}`+
        `&howMany=${howManyPosts}`+
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

      // Remove post to cause a gap error
      //data.postsResponse.splice(1, 1);

      if (data.postsResponse.length === 0) {
        return;
      }
      const { MerkleMapWitness, fetchAccount, Field } = await import('o1js');
      const { PostState, ReactionState } = await import('wrdhom');

      const postsContractData = await fetchAccount({
        publicKey: 'B62qjmB7ixT56qfBeNDwvkpn4XfoNYZYdotor2gkmGqJ34fawiX6y1J'
      }, '/graphql');
      const fetchedUsersPostsCountersRoot = postsContractData.account?.zkapp?.appState[1].toString();
      console.log('fetchedUsersPostsCountersRoot: ' + fetchedUsersPostsCountersRoot);
      const fetchedPostsRoot = postsContractData.account?.zkapp?.appState[2].toString();
      console.log('fetchedPostsRoot: ' + fetchedPostsRoot);

      const reactionsContractData = await fetchAccount({
        publicKey: 'B62qjAcv5DCDqAD8nmKnXEPz926Qx7NjTBTVbZ1BevASNtr7ccXrCKF'
      }, '/graphql');
      const fetchedTargetsReactionsCountersRoot = reactionsContractData.account?.zkapp?.appState[2].toString();
      console.log('fetchedTargetsReactionsCountersRoot: ' + fetchedTargetsReactionsCountersRoot);
      const fetchedReactionsRoot = reactionsContractData.account?.zkapp?.appState[3].toString();
      console.log('fetchedReactionsRoot: ' + fetchedReactionsRoot);

      const commentsContractData = await fetchAccount({
        publicKey: 'B62qmEfk2AC677Y8J7GJUHRjA1CAsVyrcfuipVu4zc6wrPyHdz2PQFY'
      }, '/graphql');
      const fetchedTargetsCommentsCountersRoot = commentsContractData.account?.zkapp?.appState[2].toString();
      console.log('fetchedTargetsCommentsCountersRoot: ' + fetchedTargetsCommentsCountersRoot);

      const repostsContractData = await fetchAccount({
        publicKey: 'B62qp4CtQEmTSwcTj9qXkNJNtD4JpYW4EcHq1b3Rna2FQcKzaeJafsd'
      }, '/graphql');
      const fetchedTargetsRepostsCountersRoot = repostsContractData.account?.zkapp?.appState[2].toString();
      console.log('fetchedTargetsRepostsCountersRoot: ' + fetchedTargetsRepostsCountersRoot);

      const numberOfPostsWitness = MerkleMapWitness.fromJSON(data.numberOfPostsWitness);
      let calculatedUsersPostsCountersRoot = numberOfPostsWitness.computeRootAndKey(
        Field(data.numberOfPosts))[0].toString();
      console.log('calculatedUsersPostsCountersRoot: ' + calculatedUsersPostsCountersRoot);

      if (fetchedUsersPostsCountersRoot !== calculatedUsersPostsCountersRoot) {
        throw new Error(`The server stated that there are ${data.numberOfPosts} total posts, but the contract accounts for a different amount.\
        The server may be experiencing issues or manipulating responses.`);
      }

      // Remove reaction to cause a gap error
      // data.postsResponse[1].reactionsResponse.splice(1,1);

      const processedPosts: ProcessedPosts[] = [];
      for (let i = 0; i < data.postsResponse.length; i++) {
        const postStateJSON = JSON.parse(data.postsResponse[i].postState);
        const shortPosterAddressEnd = postStateJSON.posterAddress.slice(-12);
        const postWitness = MerkleMapWitness.fromJSON(data.postsResponse[i].postWitness);
        const numberOfReactionsWitness = MerkleMapWitness.fromJSON(data.postsResponse[i].numberOfReactionsWitness);
        const numberOfCommentsWitness = MerkleMapWitness.fromJSON(data.postsResponse[i].numberOfCommentsWitness);
        const numberOfRepostsWitness = MerkleMapWitness.fromJSON(data.postsResponse[i].numberOfRepostsWitness);
        const postState = PostState.fromJSON(postStateJSON);
        let calculatedPostsRoot = postWitness.computeRootAndKey(postState.hash())[0].toString();
        console.log('calculatedPostsRoot: ' + calculatedPostsRoot);
        let calculatedTargetsReactionsCountersRoot = numberOfReactionsWitness.computeRootAndKey(
          Field(data.postsResponse[i].numberOfReactions))[0].toString();
        console.log('calculatedTargetsReactionsCountersRoot: ' + calculatedTargetsReactionsCountersRoot);
        let calculatedTargetsCommentsCountersRoot = numberOfCommentsWitness.computeRootAndKey(
          Field(data.postsResponse[i].numberOfComments))[0].toString();
        console.log('calculatedTargetsCommentsCountersRoot: ' + calculatedTargetsCommentsCountersRoot);
        let calculatedTargetsRepostsCountersRoot = numberOfRepostsWitness.computeRootAndKey(
          Field(data.postsResponse[i].numberOfReposts))[0].toString();
        console.log('calculatedTargetsRepostsCountersRoot: ' + calculatedTargetsRepostsCountersRoot);
        const processedReactions: ProcessedReactions[] = [];

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
          data.postsResponse[i].content = 'wrong content';
        }*/

        // Audit that all posts come from the profile we are visiting
        if (profileAddress !== postStateJSON.posterAddress) {
          throw new Error(`User Post ${postStateJSON.userPostsCounter} comes from a wrong address. All posts should come from address: ${profileAddress}`);
        }

        // Audit that all posts are between the block range in the user query
        if (postStateJSON.postBlockHeight < fromBlock ||  postStateJSON.postBlockHeight > toBlock) {
          throw new Error(`Block-length ${postStateJSON.postBlockHeight} for Post ${postStateJSON.allPostsCounter} isn't between the block range\
          ${fromBlock} to ${toBlock}`);
        }

        // Audit that the on-chain state matches the off-chain state

        if (fetchedPostsRoot !== calculatedPostsRoot) {
          throw new Error(`Post ${postStateJSON.allPostsCounter} has different root than zkApp state. The server may be experiencing some issues or\
          manipulating results for your query.`);
        }

        if (fetchedTargetsReactionsCountersRoot !== calculatedTargetsReactionsCountersRoot ) {
          throw new Error(`Server stated that there are ${data.postsResponse[i].numberOfReactions} reactions for post ${postStateJSON.allPostsCounter},\
          but the contract accounts for a different amount. The server may be experiencing issues or manipulating responses.`);
        }

        if (fetchedTargetsCommentsCountersRoot !== calculatedTargetsCommentsCountersRoot) {
          throw new Error(`Server stated that there are ${data.postsResponse[i].numberOfComments} comments for post ${postStateJSON.allPostsCounter},\
          but the contract accounts for a different amount. The server may be experiencing issues or manipulating responses.`);
        }

        if (fetchedTargetsRepostsCountersRoot !== calculatedTargetsRepostsCountersRoot) {
          throw new Error(`Server stated that there are ${data.postsResponse[i].numberOfReposts} reposts for post ${postStateJSON.allPostsCounter},\
          but the contract accounts for a different amount. The server may be experiencing issues or manipulating responses.`);
        }

        // Audit that the content of posts matches the contentID signed by the author
        const cid = await getCID(data.postsResponse[i].content);
        if (cid !== data.postsResponse[i].postContentID) {
          throw new Error(`The content for Post ${postStateJSON.allPostsCounter} doesn't match the expected contentID. The server may be experiencing\
          some issues or manipulating the content it shows.`);
        }

        // Audit that the number of reactions the server retrieves, matches the number of reactions accounted on the zkApp state
        if(data.postsResponse[i].reactionsResponse.length !== data.postsResponse[i].numberOfReactions) {
          throw new Error(`Server stated that there are ${data.postsResponse[i].numberOfReactions} reactions for post ${postStateJSON.allPostsCounter},\
          but it only provided ${data.postsResponse[i].reactionsResponse.length} reactions. The server may be experiencing some issues or manipulating
          the content it shows.`)
        }

        for (let r = 0; r < data.postsResponse[i].reactionsResponse.length; r++) {
          const reactionStateJSON = JSON.parse(data.postsResponse[i].reactionsResponse[r].reactionState);
          const reactionWitness = MerkleMapWitness.fromJSON(data.postsResponse[i].reactionsResponse[r].reactionWitness);
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

        processedPosts.push({
            postState: postStateJSON,
            postKey: data.postsResponse[i].postKey,
            postContentID: data.postsResponse[i].postContentID,
            content: data.postsResponse[i].content,
            shortPosterAddressEnd: shortPosterAddressEnd,
            postsRoot: calculatedPostsRoot,
            processedReactions: processedReactions,
            top3Emojis: top3Emojis,
            numberOfReactions: data.postsResponse[i].numberOfReactions,
            numberOfComments: data.postsResponse[i].numberOfComments,
            numberOfReposts: data.postsResponse[i].numberOfReposts
        });
      };

      setPosts(processedPosts);
    } catch (e: any) {
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

      // Remove repost to cause a gap error
      // data.splice(1, 1);

      if (data.repostsResponse.length === 0) {
        return;
      }
      const { MerkleMapWitness, fetchAccount, Field } = await import('o1js');
      const { PostState, ReactionState, RepostState } = await import('wrdhom');

      const postsContractData = await fetchAccount({
        publicKey: 'B62qjmB7ixT56qfBeNDwvkpn4XfoNYZYdotor2gkmGqJ34fawiX6y1J'
      }, '/graphql');
      const fetchedPostsRoot = postsContractData.account?.zkapp?.appState[2].toString();
      console.log('fetchedPostsRoot: ' + fetchedPostsRoot);

      const reactionsContractData = await fetchAccount({
        publicKey: 'B62qjAcv5DCDqAD8nmKnXEPz926Qx7NjTBTVbZ1BevASNtr7ccXrCKF'
      }, '/graphql');
      const fetchedTargetsReactionsCountersRoot = reactionsContractData.account?.zkapp?.appState[2].toString();
      console.log('fetchedTargetsReactionsCountersRoot: ' + fetchedTargetsReactionsCountersRoot);
      const fetchedReactionsRoot = reactionsContractData.account?.zkapp?.appState[3].toString();
      console.log('fetchedReactionsRoot: ' + fetchedReactionsRoot);

      const commentsContractData = await fetchAccount({
        publicKey: 'B62qmEfk2AC677Y8J7GJUHRjA1CAsVyrcfuipVu4zc6wrPyHdz2PQFY'
      }, '/graphql');
      const fetchedTargetsCommentsCountersRoot = commentsContractData.account?.zkapp?.appState[2].toString();
      console.log('fetchedTargetsCommentsCountersRoot: ' + fetchedTargetsCommentsCountersRoot);

      const repostsContractData = await fetchAccount({
        publicKey: 'B62qp4CtQEmTSwcTj9qXkNJNtD4JpYW4EcHq1b3Rna2FQcKzaeJafsd'
      }, '/graphql');
      const fetchedUsersRepostsCountersRoot = repostsContractData.account?.zkapp?.appState[1].toString();
      console.log('fetchedUsersRepostsCountersRoot: ' + fetchedUsersRepostsCountersRoot);
      const fetchedTargetsRepostsCountersRoot = repostsContractData.account?.zkapp?.appState[2].toString();
      console.log('fetchedTargetsRepostsCountersRoot: ' + fetchedTargetsRepostsCountersRoot);
      const fetchedRepostsRoot = repostsContractData.account?.zkapp?.appState[3].toString();
      console.log('fetchedRepostsRoot: ' + fetchedRepostsRoot);

      const numberOfRepostsWitness = MerkleMapWitness.fromJSON(data.numberOfRepostsWitness);
      let calculatedUsersRepostsCountersRoot = numberOfRepostsWitness.computeRootAndKey(
        Field(data.numberOfReposts))[0].toString();
      console.log('calculatedUsersRepostsCountersRoot: ' + calculatedUsersRepostsCountersRoot);

      if (fetchedUsersRepostsCountersRoot !== calculatedUsersRepostsCountersRoot) {
        throw new Error(`The server stated that there are ${data.numberOfReposts} total reposts, but the contract accounts for a different amount.\
        The server may be experiencing issues or manipulating responses.`);
      }

      // Remove reaction to cause a gap error
      // data.repostsResponse[1].reactionsResponse.splice(1, 1);

      const processedReposts: ProcessedReposts[] = [];
      for (let i = 0; i < data.repostsResponse.length; i++) {
        const repostStateJSON = JSON.parse(data.repostsResponse[i].repostState);
        const postStateJSON = JSON.parse(data.repostsResponse[i].postState);
        const shortReposterAddressEnd = repostStateJSON.reposterAddress.slice(-12);
        const shortPosterAddressEnd = postStateJSON.posterAddress.slice(-12);
        const repostWitness = MerkleMapWitness.fromJSON(data.repostsResponse[i].repostWitness);
        const postWitness = MerkleMapWitness.fromJSON(data.repostsResponse[i].postWitness);
        const numberOfReactionsWitness = MerkleMapWitness.fromJSON(data.repostsResponse[i].numberOfReactionsWitness);
        const numberOfCommentsWitness = MerkleMapWitness.fromJSON(data.repostsResponse[i].numberOfCommentsWitness);
        const numberOfRepostsWitness = MerkleMapWitness.fromJSON(data.repostsResponse[i].numberOfRepostsWitness);
        const repostState = RepostState.fromJSON(repostStateJSON);
        const postState = PostState.fromJSON(postStateJSON);
        let calculatedRepostsRoot = repostWitness.computeRootAndKey(repostState.hash())[0].toString();
        console.log('calculatedRepostsRoot: ' + calculatedRepostsRoot);
        let calculatedPostsRoot = postWitness.computeRootAndKey(postState.hash())[0].toString();
        console.log('calculatedPostsRoot: ' + calculatedPostsRoot);
        let calculatedTargetsReactionsCountersRoot = numberOfReactionsWitness.computeRootAndKey(
          Field(data.repostsResponse[i].numberOfReactions))[0].toString();
        console.log('calculatedTargetsReactionsCountersRoot: ' + calculatedTargetsReactionsCountersRoot);
        let calculatedTargetsCommentsCountersRoot = numberOfCommentsWitness.computeRootAndKey(
          Field(data.repostsResponse[i].numberOfComments))[0].toString();
        console.log('calculatedTargetsCommentsCountersRoot: ' + calculatedTargetsCommentsCountersRoot);
        let calculatedTargetsRepostsCountersRoot = numberOfRepostsWitness.computeRootAndKey(
          Field(data.repostsResponse[i].numberOfReposts))[0].toString();
        console.log('calculatedTargetsRepostsCountersRoot: ' + calculatedTargetsRepostsCountersRoot);
        const processedReactions: ProcessedReactions[] = [];

        // Introduce different root to cause a root mismatch
        /*if (index === 0) {
          calculatedRepostsRoot = 'badRoot'
        }*/

        // Introduce different block-length to cause block mismatch
        /*if (index === 2) {
          repostStateJSON.repostBlockHeight = 10000000000;
        }*/

        // Introduce different content to cause content mismatch
        /*if (i === 0) {
          data.repostsResponse[i].content = 'wrong content';
        }*/

        // Audit that all reposts come from the profile we are visiting
        if (profileAddress !== repostStateJSON.reposterAddress) {
          throw new Error(`User Repost ${repostStateJSON.userRepostsCounter} comes from the wrong address: ${repostStateJSON.reposterAddress}. All posts should come from address: ${profileAddress}`);
        }

        // Audit that all reposts are between the block range in the user query
        if (repostStateJSON.repostBlockHeight < fromBlockReposts ||  repostStateJSON.repostBlockHeight > toBlockReposts) {
          throw new Error(`Block-length ${repostStateJSON.repostBlockHeight} for Repost ${repostStateJSON.allRepostsCounter} isn't between the block range\
          ${fromBlockReposts} to ${toBlockReposts}`);
        }

        // Audit that the on-chain state matches the off-chain state

        if (fetchedRepostsRoot !== calculatedRepostsRoot) {
          throw new Error(`Repost ${repostStateJSON.allRepostsCounter} has different root than zkApp state. The server may be experiencing some issues or\
          manipulating results for your query.`);
        }    

        if (fetchedPostsRoot !== calculatedPostsRoot) {
          throw new Error(`Post ${postStateJSON.allPostsCounter} from repost ${repostStateJSON.allRepostsCounter} has different root than zkApp state.\
          The server may be experiencing some issues or manipulating results for your query.`);
        }

        if (fetchedTargetsReactionsCountersRoot !== calculatedTargetsReactionsCountersRoot ) {
          throw new Error(`Server stated that there are ${data.repostsResponse[i].numberOfReactions} reactions for post ${postStateJSON.allPostsCounter}\
          from repost ${repostStateJSON.allRepostsCounter} but the contract accounts for a different amount. The server may be experiencing issues or\
          manipulating responses.`);
        }

        if (fetchedTargetsCommentsCountersRoot !== calculatedTargetsCommentsCountersRoot) {
          throw new Error(`Server stated that there are ${data.repostsResponse[i].numberOfComments} comments for post ${postStateJSON.allPostsCounter}\
          from repost ${repostStateJSON.allRepostsCounter}, but the contract accounts for a different amount. The server may be experiencing issues or\
          manipulating responses.`);
        }

        if (fetchedTargetsRepostsCountersRoot !== calculatedTargetsRepostsCountersRoot) {
          throw new Error(`Server stated that there are ${data.repostsResponse[i].numberOfReposts} reposts for post ${postStateJSON.allPostsCounter}\
          from repost ${repostStateJSON.allRepostsCounter}, but the contract accounts for a different amount. The server may be experiencing issues or\
          manipulating responses.`);
        }

        // Audit that the content of the reposted posts matches the contentID signed by the post author
        const cid = await getCID(data.repostsResponse[i].content);
        if (cid !== data.repostsResponse[i].postContentID) {
          throw new Error(`The content for Post ${postStateJSON.allPostsCounter} from Repost ${repostStateJSON.allRepostsCounter} doesn't match\
          the expected contentID. The server may be experiencing some issues or manipulating the content it shows.`);
        }

        // Audit that the number of reactions the server retrieves, matches the number of reactions accounted on the zkApp state
        if(data.repostsResponse[i].reactionsResponse.length !== data.repostsResponse[i].numberOfReactions) {
          throw new Error(`Server stated that there are ${data.repostsResponse[i].numberOfReactions} reactions for post ${postStateJSON.allPostsCounter}\
          from repost ${repostStateJSON.allRepostsCounter} but it only provided ${data.repostsResponse[i].reactionsResponse.length} reactions. The server\
          may be experiencing some issues or manipulating the content it shows.`)
        }

        for (let r = 0; r < data.repostsResponse[i].reactionsResponse.length; r++) {
          const reactionStateJSON = JSON.parse(data.repostsResponse[i].reactionsResponse[r].reactionState);
          const reactionWitness = MerkleMapWitness.fromJSON(data.repostsResponse[i].reactionsResponse[r].reactionWitness);
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

        processedReposts.push({
            repostState: repostStateJSON,
            repostKey: data.repostsResponse[i].repostKey,
            shortReposterAddressEnd: shortReposterAddressEnd,
            postState: postStateJSON,
            postKey: data.repostsResponse[i].postKey,
            postContentID: data.repostsResponse[i].postContentID,
            content: data.repostsResponse[i].content,
            shortPosterAddressEnd: shortPosterAddressEnd,
            postsRoot: calculatedPostsRoot,
            processedReactions: processedReactions,
            top3Emojis: top3Emojis,
            numberOfReactions: data.repostsResponse[i].numberOfReactions,
            numberOfComments: data.repostsResponse[i].numberOfComments,
            numberOfReposts: data.repostsResponse[i].numberOfReposts
        });
      };

      setReposts(processedReposts);
    } catch (e: any) {
        setLoading(false);
        setErrorMessage(e.message);
    }
  };

  const auditNoMissingPosts = () => {
    try {
      for (let i = 0; i < posts.length-1; i++) {
        if (Number(posts[i].postState.userPostsCounter) !== Number(posts[i+1].postState.userPostsCounter)+1) {
          throw new Error(`Gap between User Posts ${posts[i].postState.userPostsCounter} and ${posts[i+1].postState.userPostsCounter}.\
          The server may be experiencing some issues or censoring posts.`);
        }

        for (let r = 0; r < Number(posts[i].processedReactions.length)-1; r++) {
          if (Number(posts[i].processedReactions[r].reactionState.targetReactionsCounter)
          !== Number(posts[i].processedReactions[r+1].reactionState.targetReactionsCounter)+1) {
            throw new Error(`Gap between Reactions ${posts[i].processedReactions[r].reactionState.targetReactionsCounter} and\
            ${posts[i].processedReactions[r+1].reactionState.targetReactionsCounter}, from User Post ${posts[i].postState.userPostsCounter}\
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
        if (Number(reposts[i].repostState.userRepostsCounter) !== Number(reposts[i+1].repostState.userRepostsCounter)+1) {
          throw new Error(`Gap between User Reposts ${reposts[i].repostState.userRepostsCounter} and ${reposts[i+1].repostState.userRepostsCounter}.\
          The server may be experiencing some issues or censoring reposts.`);
        }

        for (let r = 0; r < Number(reposts[i].processedReactions.length)-1; r++) {
          if (Number(reposts[i].processedReactions[r].reactionState.targetReactionsCounter)
          !== Number(reposts[i].processedReactions[r+1].reactionState.targetReactionsCounter)+1) {
            throw new Error(`Gap between Reactions ${reposts[i].processedReactions[r].reactionState.targetReactionsCounter} and\
            ${reposts[i].processedReactions[r+1].reactionState.targetReactionsCounter} from User Repost ${reposts[i].repostState.userRepostsCounter}\
            The server may be experiencing some issues or censoring reactions.`);
          }
        }
      }
    } catch (e: any) {
        setErrorMessage(e.message);
    }
  }


  const goBack = () => {
    setShowProfile(false);
    setProfileAddress('');
    setCommentTarget(null);
    setHideGetPosts('');
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
      setTriggerAudit(!triggerAudit);
    })();
  }, [getProfile, profileAddress]);

  useEffect(() => {
    auditNoMissingPosts();
    auditNoMissingReposts();
    mergeAndSortContent();
  }, [triggerAudit]);

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
      {!loading && warningMessage && <p className="border-4 p-2 shadow-lg break-normal overflow-wrap">Warning: {warningMessage}</p>}
      {!loading && !errorMessage && Array.isArray(mergedContent) && mergedContent.map((post) => {
        return (
            <div key={post.repostKey === undefined ? post.postKey : post.repostKey} className="p-2 border-b-2 shadow-lg">
                {post.repostState === undefined ? null :
                  <div
                    className="text-xs text-stone-400"
                    onMouseEnter={() => setSelectedProfileAddress(post.repostState.reposterAddress)}
                    onClick={() => setProfileAddress(selectedProfileAddress)}
                  >
                  <span className="cursor-pointer hover:underline">{post.shortReposterAddressEnd}</span> 
                    {` reposted at block ${post.repostState.repostBlockHeight} (User Repost:${post.repostState.userRepostsCounter})`}
                </div>}
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
                  <p className="text-xs ml-1 mt-2">{post.processedReactions.length > 0 ? post.processedReactions.length : null}</p>
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