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

  const fetchItems = async (contentType: ContentType) => {
    try {
      const endpoint = contentType === 'Posts' ? '/posts' : '/reposts';
      const queryParams = contentType === 'Posts' 
        ? `?howMany=${howManyPosts}&fromBlock=${fromBlock}&toBlock=${toBlock}&currentUser=${account[0]}`
        : `?howMany=${howManyReposts}&fromBlock=${fromBlockReposts}&toBlock=${toBlockReposts}`;

      const response = await fetch(`${endpoint}${queryParams}`, {
        headers: {'Cache-Control': 'no-cache'}
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: any = await response.json();
      const itemsResponse = contentType === 'Posts' ? data.postsResponse : data.repostsResponse;

      if (itemsResponse.length === 0) {
        return;
      }

      const processedItems = itemsResponse.map((item: any) => processItem(item, contentType));

      if (contentType === 'Posts') {
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

  const processItem = (item: any, contentType: ContentType) => {
    const postStateJSON = JSON.parse(contentType === 'Posts' ? item.postState : item.postState);
    const repostStateJSON = contentType === 'Reposts' ? JSON.parse(item.repostState) : undefined;

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

    if (contentType === 'Posts') {
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
      await auditItems(posts, 'Posts', fromBlock, toBlock);
    } catch (e: any) {
      console.log(e);
      setLoading(false);
      setErrorMessage(e.message);
    }
  };
  
  const auditReposts = async () => {
    try {
      if (reposts.length === 0) return;
      await auditItems(reposts, 'Reposts', fromBlockReposts, toBlockReposts);
    } catch (e: any) {
      console.log(e);
      setLoading(false);
      setErrorMessage(e.message);
    }
  };

  async function auditItems(items: any[], contentType: ContentType, fromBlock: number, toBlock: number) {
    const { MerkleMapWitness, Field } = await import('o1js');
    const { PostState, RepostState } = await import('wrdhom');
    const lowercaseCT = contentType.toLowerCase();
    const lowercaseSingularCT =  lowercaseCT.slice(0, -1);
    const singularCT = contentType.slice(0, -1);
  
    const [postsAppState, reactionsAppState, commentsAppState, repostsAppState] = await Promise.all([
      fetchContractData(postsContractAddress),
      fetchContractData(reactionsContractAddress),
      fetchContractData(commentsContractAddress),
      fetchContractData(repostsContractAddress)
    ]);
  
    const fetchedPostsRoot = postsAppState![2].toString();
    const fetchedTargetsReactionsCountersRoot = reactionsAppState![2].toString();
    const fetchedReactionsRoot = reactionsAppState![3].toString();
    const fetchedTargetsCommentsCountersRoot = commentsAppState![2].toString();
    const fetchedCommentsRoot = commentsAppState![3].toString();
    const fetchedTargetsRepostsCountersRoot = repostsAppState![2].toString();
    const fetchedRepostsRoot = repostsAppState![3].toString();
  
    for (const item of items) {
      const itemState: any = (contentType === 'Posts' ? PostState : RepostState).fromJSON(item[`${lowercaseSingularCT}State`]);
      const allItemsCounter = itemState[`all${contentType}Counter`];
      const blockHeight = itemState[`${lowercaseSingularCT}BlockHeight`];

      // Audit block range
      if (blockHeight < fromBlock || blockHeight > toBlock) {
        throw new Error(`Block-length ${blockHeight} for ${singularCT} ${allItemsCounter} `
          +`isn't between the block range ${fromBlock} to ${toBlock}`);
      }

      const itemWitness = MerkleMapWitness.fromJSON(item[`${lowercaseSingularCT}Witness`]);
      const calculatedRoot = itemWitness.computeRootAndKeyV2(itemState.hash())[0].toString();
  
      // Audit against items onchain root
      if ((contentType === 'Posts' ? fetchedPostsRoot : fetchedRepostsRoot) !== calculatedRoot) {
        throw new Error(`${singularCT} ${item[`${lowercaseCT}State`][`all${contentType}Counter`]} has different root than zkApp state. `
          +`The server may be experiencing some issues or manipulating results for your query.`);
      }
  
      if (Number(itemState.deletionBlockHeight) === 0) {
        // Audit content
        const cid = await getCID(item.content);
        if (cid !== item.postContentID) {
          throw new Error(`The content for ${singularCT} ${allItemsCounter} doesn't match the expected contentID. `
            +`The server may be experiencing some issues or manipulating the content it shows.`);
        }
  
        // Audit embedded items
        await auditEmbeddedItems(item, 'Reactions', fetchedReactionsRoot, fetchedTargetsReactionsCountersRoot);
        await auditEmbeddedItems(item, 'Comments', fetchedCommentsRoot, fetchedTargetsCommentsCountersRoot);
        await auditEmbeddedItems(item, 'Reposts', fetchedRepostsRoot, fetchedTargetsRepostsCountersRoot);
      }
    };
  }

  async function auditEmbeddedItems(
    parentItem: any,
    contentType: ContentType,
    fetchedItemsRoot: string,
    fetchedTargetItemsRoot: string
  ) {
    const { MerkleMapWitness, Field } = await import('o1js');
    const { ReactionState, CommentState, RepostState } = await import('wrdhom');
    const embeddedItems = parentItem[`embedded${contentType}`] ?? parentItem[`allEmbedded${contentType}`];
    const lowercaseCT = contentType.toLowerCase();
    const lowercaseSingularCT =  contentType.toLowerCase().slice(0, -1);
    const singularCT = contentType.slice(0, -1);
    const statedNumberOfEmbeddedItems = parentItem[`numberOf${contentType}`];
  
    if (embeddedItems.length !== statedNumberOfEmbeddedItems) {
      throw new Error(`The server stated that there are ${statedNumberOfEmbeddedItems} ${contentType} for `
        +`${parentItem.contentType} ${parentItem.id}, but it only provided ${embeddedItems.length} ${contentType}s. `
        +`The server may be experiencing some issues or manipulating the content it shows.`);
    }

    const numberOfItemsWitness = MerkleMapWitness.fromJSON(parentItem[`numberOf${contentType}Witness`]);
    const calculatedTargetsItemsCountersRoot = numberOfItemsWitness.computeRootAndKeyV2(
      Field(statedNumberOfEmbeddedItems)
    )[0].toString();

    if (fetchedTargetItemsRoot !== calculatedTargetsItemsCountersRoot ) {
      throw new Error(`The server stated that there are ${statedNumberOfEmbeddedItems} ${lowercaseCT} for Post ${parentItem.allPostsCounter},`
      +` but the contract accounts for a different amount. The server may be experiencing issues or manipulating responses.`);
    }
  
    embeddedItems.forEach((item: any) => {
      const stateJSON = item[`${lowercaseSingularCT}State`];
      const witness = MerkleMapWitness.fromJSON(item[`${lowercaseSingularCT}Witness`]);
      const state: any = (contentType === 'Reactions' ? ReactionState : contentType === 'Comments' ? CommentState : RepostState).fromJSON(stateJSON);
      const calculatedRoot = witness.computeRootAndKeyV2(state.hash())[0].toString();
  
      if (fetchedItemsRoot !== calculatedRoot) {
        throw new Error(`${singularCT} ${stateJSON[`all${contentType}sCounter`]} has different root than zkApp state. `
          +`The server may be experiencing some issues or manipulating results for the ${lowercaseSingularCT}s `
          +`to ${parentItem.contentType} ${parentItem.id}.`);
      }
    });
  }

  async function fetchContractData(contractAddress: string) {
    const { fetchAccount } = await import('o1js');
    const contractData = await fetchAccount({ publicKey: contractAddress }, '/graphql');
    return contractData.account?.zkapp?.appState;
  }

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
      howManyPosts > 0 ? await fetchItems('Posts') : null;
      howManyReposts > 0 ? await fetchItems('Reposts') : null;
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