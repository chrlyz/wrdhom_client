import { Dispatch, SetStateAction } from "react";
import { getCID } from '../../utils/cid';
import { ContentType, FeedType } from '../../types';

export const auditPosts = async (
    feedType: FeedType,
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
      if (feedPostsContext.posts.length === 0) return;
      await auditItems(
        feedPostsContext.posts,
        feedType,
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
    feedType: FeedType,
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
        feedType,
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
    feedType: FeedType,
    contentType: ContentType,
    fromBlock: number,
    toBlock: number,
    postsContractAddress: string,
    reactionsContractAddress: string,
    commentsContractAddress: string,
    repostsContractAddress: string,
) {
    const { MerkleMapWitness, Poseidon, CircuitString } = await import('o1js');
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
  
    for (let i = 0; i < items.length; i++) {
      const itemState: any = (contentType === 'Posts' ? PostState : RepostState).fromJSON(items[i][`${lowercaseSingularCT}State`]);
      const postState = PostState.fromJSON(items[i].postState);
      const allItemsCounter = itemState[`all${contentType}Counter`];
      const usersItemsCounter = itemState[`user${contentType}Counter`];
      if (i+1 < items.length) {
        const nextItemState: any = (contentType === 'Posts' ? PostState : RepostState).fromJSON(items[i+1][`${lowercaseSingularCT}State`]);
        checkGap(allItemsCounter, nextItemState[`all${contentType}Counter`], contentType);
      }
      const blockHeight = Number(itemState[`${lowercaseSingularCT}BlockHeight`]);

      // Audit block range
      if (blockHeight < fromBlock || blockHeight > toBlock) {
        throw new Error(
          `Block-length ${blockHeight} for `
          +`${feedType === 'global' ? singularCT + ' ' + allItemsCounter : 'User ' + singularCT + ' ' + usersItemsCounter} `
          +`isn't between the block range ${fromBlock} to ${toBlock}`
        );
      }

      // Audit post key
      const posterAddressAsField = Poseidon.hash(postState.posterAddress.toFields());
      const postKeyAsField = Poseidon.hash([posterAddressAsField, postState.postContentID.hash()]);
      if (postKeyAsField.toString() !== items[i].postKey) {
        throw new Error(
          `Post Key for ${feedType === 'global' ? singularCT + ' ' + allItemsCounter : 'User ' + singularCT + ' ' + usersItemsCounter}`
          +` doesn't belong to ${singularCT}`
        );
      }

      // // Audit that the items match the onchain state
      const itemWitness = MerkleMapWitness.fromJSON(items[i][`${lowercaseSingularCT}Witness`]);
      const calculatedRoot = itemWitness.computeRootAndKeyV2(itemState.hash())[0].toString();
      if ((contentType === 'Posts' ? fetchedPostsRoot : fetchedRepostsRoot) !== calculatedRoot) {
        throw new Error(
          `${feedType === 'global' ? singularCT + ' ' + allItemsCounter : 'User ' + singularCT + ' ' + usersItemsCounter}`
          +` has different root than zkApp state. The server may be experiencing some issues or manipulating results for your query.`
        );
      }
  
      if (Number(itemState.deletionBlockHeight) === 0) {

        // Audit that the content matches the onchain state
        const cid = await getCID(items[i].content);
        if (cid !== CircuitString.fromJSON(items[i].postState.postContentID).toString()) {
          throw new Error(
            `The content for ${feedType === 'global' ? singularCT + ' ' + allItemsCounter : 'User ' + singularCT + ' ' + usersItemsCounter}`+
            ` doesn't match the expected contentID. The server may be experiencing some issues or manipulating the content it shows.`
          );
        }
  
        // Audit embedded items
        await auditEmbeddedItems(items[i], feedType, 'Reactions', fetchedReactionsRoot, fetchedTargetsReactionsCountersRoot);
        await auditEmbeddedItems(items[i], feedType, 'Comments', fetchedCommentsRoot, fetchedTargetsCommentsCountersRoot);
        await auditEmbeddedItems(items[i], feedType, 'Reposts', fetchedRepostsRoot, fetchedTargetsRepostsCountersRoot);
      }
    };
  }

  async function fetchContractData(contractAddress: string) {
    const { fetchAccount } = await import('o1js');
    const contractData = await fetchAccount({ publicKey: contractAddress }, '/graphql');
    return contractData.account?.zkapp?.appState;
  }

  async function auditEmbeddedItems(
    parentItem: any,
    feedType: FeedType,
    contentType: ContentType,
    fetchedItemsRoot: string,
    fetchedTargetItemsRoot: string
  ) {
    const { MerkleMapWitness, Field } = await import('o1js');
    const { ReactionState, CommentState, RepostState } = await import('wrdhom');
    const embeddedItems = parentItem[`embedded${contentType}`] ?? parentItem[`allEmbedded${contentType}`];
    const parentContentType = 'repostState' in parentItem ? 'Reposts' : 'Posts';
    const singularParentCT = parentContentType.slice(0, -1);
    const lowercaseSingularParentCT = singularParentCT.toLocaleLowerCase();
    const statedNumberOfEmbeddedItems = parentItem[`numberOf${contentType}`];
    const allItemsCounter = parentItem[`${lowercaseSingularParentCT}State`][`all${parentContentType}Counter`];
    const usersItemsCounter = parentItem[`${lowercaseSingularParentCT}State`][`user${parentContentType}Counter`];
    const lowercaseSingularCT =  contentType.toLowerCase().slice(0, -1);
    const singularCT = contentType.slice(0, -1);
  
    // Audit that the server retrieves the same amount of embedded items it reports
    if (embeddedItems.length !== statedNumberOfEmbeddedItems) {
      throw new Error(
        `The server stated that there are ${statedNumberOfEmbeddedItems} ${contentType} `
        +`for ${feedType === 'global' ? singularParentCT + ' ' + allItemsCounter : 'User ' + singularParentCT + ' ' + usersItemsCounter},`
        +` but it only provided ${embeddedItems.length} ${contentType}. `
        +`The server may be experiencing some issues or manipulating the content it shows.`
      );
    }

    // Audit that the amount of embedded items the server reports matches the onchain state
    const numberOfItemsWitness = MerkleMapWitness.fromJSON(parentItem[`numberOf${contentType}Witness`]);
    const calculatedTargetsItemsCountersRoot = numberOfItemsWitness.computeRootAndKeyV2(
      Field(statedNumberOfEmbeddedItems)
    )[0].toString();

    if (fetchedTargetItemsRoot !== calculatedTargetsItemsCountersRoot ) {
      throw new Error(
        `The server stated that there are ${statedNumberOfEmbeddedItems} ${contentType} for `
        +`${feedType === 'global' ? singularParentCT + ' ' + allItemsCounter : 'User ' + singularParentCT + ' ' + usersItemsCounter},`
        +` but the contract accounts for a different amount. The server may be experiencing issues or manipulating responses.`
      );
    }
  
    for (let i = 0; i < embeddedItems.length; i++) {
      const stateJSON = embeddedItems[i][`${lowercaseSingularCT}State`];
      const witness = MerkleMapWitness.fromJSON(embeddedItems[i][`${lowercaseSingularCT}Witness`]);
      const state: any = (contentType === 'Reactions' ? ReactionState : contentType === 'Comments' ? CommentState : RepostState).fromJSON(stateJSON);
      const calculatedRoot = witness.computeRootAndKeyV2(state.hash())[0].toString();

      // Audit that embedded items belong to the parent item
      if (stateJSON.targetKey !== parentItem.postKey) {
        throw new Error(
          `${singularCT} ${stateJSON[`target${contentType}Counter`]} from `
          +`${feedType === 'global' ? singularParentCT + ' ' + allItemsCounter : 'User ' + singularParentCT + ' ' + usersItemsCounter} `
          +`doesn't belong to ${singularParentCT}`
        );
      }
  
      // Audit that the embedded items match the onchain state
      if (fetchedItemsRoot !== calculatedRoot) {
        throw new Error(
          `${singularCT} ${stateJSON[`target${contentType}Counter`]} from `
          +`${feedType === 'global' ? singularParentCT + ' ' + allItemsCounter : 'User ' + singularParentCT + ' ' + usersItemsCounter} `
          +`has different root than zkApp state. `
          +`The server may be experiencing some issues or manipulating results for the ${contentType}s`
        );
      }

      if (i+1 < embeddedItems.length) {
        checkGap(
          embeddedItems[i][`target${contentType}Counter`],
          embeddedItems[i+1][`target${contentType}Counter`],
          contentType,
          {
            parentCounter: parentItem.repostState[`allRepostsCounter`] ?? parentItem.postState[`allPostsCounter`],
            parentContentType: parentContentType
          }
        );
      }
    };
  }

  const checkGap = (
    current: string,
    next: string,
    contentType: ContentType,
    parentInfo?: {
      parentCounter: number,
      parentContentType: ContentType
    }
  ) => {
    // Audit that no items are being omitted
    if (Number(current) !== Number(next) + 1) {
      throw new Error(
        `Gap between ${contentType} ${current} and ${next}${parentInfo?.parentCounter ? `, `
        +`from ${parentInfo?.parentContentType.slice(0, -1)} ${parentInfo?.parentCounter}` : ''}. `
        +`The server may be experiencing some issues or censoring ${contentType}.`
      );
    }
  };