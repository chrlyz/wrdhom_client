import { Dispatch, SetStateAction } from "react";
import { getCID } from '../../../utils/cid';
import { ContentType } from '../../../types';

export const auditPosts = async (
    feedGeneralContext: {
        setLoading: Dispatch<SetStateAction<boolean>>,
        setErrorMessage: Dispatch<SetStateAction<any>>,
        postsContractAddress: string,
        reactionsContractAddress: string,
        commentsContractAddress: string,
        repostsContractAddress: string,
    },
    feedPostsContext: {
        posts: any[],
        fromBlock: number,
        toBlock: number,
    }
) => {
    try {
      await auditItems(
        feedPostsContext.posts,
        'Posts',
        feedPostsContext.fromBlock,
        feedPostsContext.toBlock,
        feedGeneralContext.postsContractAddress,
        feedGeneralContext.reactionsContractAddress,
        feedGeneralContext.commentsContractAddress,
        feedGeneralContext.repostsContractAddress
    );
    } catch (e: any) {
      console.log(e);
      feedGeneralContext.setLoading(false);
      feedGeneralContext.setErrorMessage(e.message);
    }
  };
  
  export const auditReposts = async (
    feedGeneralContext: {
        setLoading: Dispatch<SetStateAction<boolean>>,
        setErrorMessage: Dispatch<SetStateAction<any>>,
        postsContractAddress: string,
        reactionsContractAddress: string,
        commentsContractAddress: string,
        repostsContractAddress: string,
    },
    feedRepostsContext: {
        reposts: any[],
        fromBlockReposts: number,
        toBlockReposts: number
    }
  ) => {
    try {
      if (feedRepostsContext.reposts.length === 0) return;
      await auditItems(
        feedRepostsContext.reposts,
        'Reposts',
        feedRepostsContext.fromBlockReposts,
        feedRepostsContext.toBlockReposts,
        feedGeneralContext.postsContractAddress,
        feedGeneralContext.reactionsContractAddress,
        feedGeneralContext.commentsContractAddress,
        feedGeneralContext.repostsContractAddress
    );
    } catch (e: any) {
      console.log(e);
      feedGeneralContext.setLoading(false);
      feedGeneralContext.setErrorMessage(e.message);
    }
  };

  async function auditItems(
    items: any[],
    contentType: ContentType,
    fromBlock: number,
    toBlock: number,
    postsContractAddress: string,
    reactionsContractAddress: string,
    commentsContractAddress: string,
    repostsContractAddress: string,
) {
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