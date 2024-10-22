import { Dispatch, SetStateAction } from "react";
import { getCID } from '../../utils/cid';
import { ContentType, FeedType } from '../../types';

export async function auditItems(
  feedType: FeedType,
  contentType: ContentType,
  {
    setLoading,
    setErrorMessage,
    postsContractAddress,
    reactionsContractAddress,
    commentsContractAddress,
    repostsContractAddress,
  }: {
    setLoading: Dispatch<SetStateAction<boolean>>,
    setErrorMessage: Dispatch<SetStateAction<any>>,
    postsContractAddress: string,
    reactionsContractAddress: string,
    commentsContractAddress: string,
    repostsContractAddress: string,
  },
  {
    items,
    fromBlock,
    toBlock,
  }: {
    items: any[],
    fromBlock: number,
    toBlock: number,
  },
  commentTarget?: any
) {
  try {
    if (items.length === 0) return;

    const { MerkleMapWitness, Poseidon, CircuitString } = await import('o1js');
    const { PostState, RepostState, CommentState } = await import('wrdhom');
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
      const itemState: any = (contentType === 'Posts' ? PostState 
                                                      : contentType === 'Reposts' ? RepostState
                                                      : CommentState)
                                                      .fromJSON(items[i][`${lowercaseSingularCT}State`]);
      const postState = PostState.fromJSON(contentType !== 'Comments' ? items[i].postState : commentTarget.postState);
      const allItemsCounter = itemState[`all${contentType}Counter`];
      const usersItemsCounter = itemState[`user${contentType}Counter`];
      const targetItemsCounter = itemState[`target${contentType}Counter`];

      if (i+1 < items.length) {
          const nextItemState: any = (contentType === 'Posts' ? PostState
                                                              : contentType === 'Reposts' ? RepostState
                                                              : CommentState)
                                                              .fromJSON(items[i+1][`${lowercaseSingularCT}State`]);
          const currentIndex = feedType === 'global' && contentType !== 'Comments'
                                  ? allItemsCounter
                                  : contentType === 'Comments'
                                  ? targetItemsCounter
                                  : usersItemsCounter;
          const nextIndex = 
                            `${
                                feedType === 'global' && contentType !== 'Comments'
                                  ?`all${contentType}Counter`
                                  : contentType === 'Comments'
                                  ? `target${contentType}Counter`
                                  : `user${contentType}Counter`
                              }`;
          checkGap(currentIndex, nextItemState[nextIndex], contentType);
      }

      const blockHeight = Number(itemState[`${lowercaseSingularCT}BlockHeight`]);

      const middleMessage = feedType === 'global' && contentType !== 'Comments'
                              ? singularCT + ' ' + allItemsCounter
                              : contentType === 'Comments'
                              ? singularCT + ' ' + targetItemsCounter
                              : 'User ' + singularCT + ' ' + usersItemsCounter;

      // Audit block range
      if (blockHeight < fromBlock || blockHeight > toBlock) {
        throw new Error(
          `Block-length ${blockHeight} for ${middleMessage}`
            +` isn't between the block range ${fromBlock} to ${toBlock}`
        );
      }

      // Audit post key
      const posterAddressAsField = Poseidon.hash(postState.posterAddress.toFields());
      const calculatedPostKey = Poseidon.hash([posterAddressAsField, postState.postContentID.hash()]);
      const statedPostKey = contentType !== 'Comments' ? items[i].postKey : itemState.targetKey;
      if (calculatedPostKey.toString() !== statedPostKey.toString()) {
        throw new Error(
          `Post Key for ${middleMessage}`
            +` doesn't belong to Post`
        );
      }

      // // Audit that the items match the onchain state
      const itemWitness = MerkleMapWitness.fromJSON(items[i][`${lowercaseSingularCT}Witness`]);
      const calculatedRoot = itemWitness.computeRootAndKeyV2(itemState.hash())[0].toString();
      if (
        (
          contentType === 'Posts'
            ? fetchedPostsRoot
            : contentType === 'Reposts' ? fetchedRepostsRoot
            : fetchedCommentsRoot
        )
        !== calculatedRoot
      ) {
        throw new Error(
          `${middleMessage}`
          +` has different root than zkApp state. The server may be experiencing some issues or manipulating results for your query.`
        );
      }
  
      if (Number(itemState.deletionBlockHeight) === 0) {

        // Audit that the content matches the onchain state
        const calculatedCID = await getCID(items[i].content);
        const statedCID = contentType !== 'Comments' ? items[i].postState.postContentID : itemState.commentContentID
        if (calculatedCID !== CircuitString.fromJSON(statedCID).toString()) {
          throw new Error(
            `The content for ${middleMessage}`
              +` doesn't match the expected contentID. The server may be experiencing some issues or manipulating the content it shows.`
          );
        }
  
        if (contentType !== 'Comments') {
          // Audit embedded items
          await auditEmbeddedItems(items[i], feedType, 'Reactions', fetchedReactionsRoot, fetchedTargetsReactionsCountersRoot);
          await auditEmbeddedItems(items[i], feedType, 'Comments', fetchedCommentsRoot, fetchedTargetsCommentsCountersRoot);
          await auditEmbeddedItems(items[i], feedType, 'Reposts', fetchedRepostsRoot, fetchedTargetsRepostsCountersRoot);
        }
      }
    };

  } catch (e: any) {
    console.log(e);
    setLoading(false);
    setErrorMessage(e.message);
  }
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
      const nextStateJSON = embeddedItems[i+1][`${lowercaseSingularCT}State`];
      const nextState: any = (contentType === 'Reactions' ? ReactionState : contentType === 'Comments' ? CommentState : RepostState).fromJSON(nextStateJSON);
      checkGap(
        state[`target${contentType}Counter`],
        nextState[`target${contentType}Counter`],
        contentType,
        {
          parentCounter: parentContentType === 'Reposts' ? parentItem.repostState[`allRepostsCounter`] : parentItem.postState[`allPostsCounter`],
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