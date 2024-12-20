import { Dispatch, SetStateAction } from "react";
import { getCID } from "../../utils/cid";
import { ContentType, FeedType } from '../../types';

export async function auditItems(
  feedType: FeedType,
  contentType: ContentType,
  {
    items,
    itemsMetadata,
    fromBlock,
    toBlock,
    setErrorMessage,
    postsContractAddress,
    reactionsContractAddress,
    commentsContractAddress,
    repostsContractAddress
  }: {
    items: any[],
    itemsMetadata: any,
    fromBlock: number,
    toBlock: number,
    setErrorMessage: Dispatch<SetStateAction<any>>,
    postsContractAddress: string,
    reactionsContractAddress: string,
    commentsContractAddress: string,
    repostsContractAddress: string
  },
  commentTarget?: any
) {
  try {
    if (items.length === 0) return false;

    const { MerkleMapWitness, Poseidon, CircuitString, Field } = await import('o1js');
    const { PostState, RepostState, CommentState } = await import('wrdhom');
    const lowercaseCT = contentType.toLowerCase();
    const lowercaseSingularCT =  lowercaseCT.slice(0, -1);
    const singularCT = contentType.slice(0, -1);

    const DELAY = 3000;
    let historicPostsState;
    let historicReactionsState;
    let historicCommentsState;
    let historicRepostsState;
    let errorMessage;
    let tries = 0;
    let auditing_historic_state = true;

    if (feedType !== 'comments') {
      while (auditing_historic_state) {
        if (tries === 10) {
          setErrorMessage(errorMessage);
          return false;
        }

        // POSTS
        const response = await fetch(`/posts/audit`
          +`?atBlockHeight=${itemsMetadata.lastPostsState.atBlockHeight}`,
          {
            headers: {'Cache-Control': 'no-cache'}
          }
        );
        const data = await response.json();
        historicPostsState = data.historicPostsState;
        const historicPostsStateWitness = MerkleMapWitness.fromJSON(JSON.parse(data.historicPostsStateWitness));
        const [calculatedPostsHistoryRoot, calculatedPostsHistoryKey] =
          historicPostsStateWitness.computeRootAndKeyV2(Field(historicPostsState.hashedState));

        if (calculatedPostsHistoryKey.toString() !== itemsMetadata.lastPostsState.atBlockHeight) {
          errorMessage = `Block height ${calculatedPostsHistoryKey.toString()} from server response doesn't`
              + `match the requested posts state history block height ${itemsMetadata.lastPostsState.atBlockHeight}`;
          tries++;
          await delay(DELAY);
          continue;
        }

        let postsAppState = await fetchContractData(postsContractAddress);
        const onchainPostsHistoryRoot = postsAppState![4].toString();
        if (calculatedPostsHistoryRoot.toString() !== onchainPostsHistoryRoot) {
          errorMessage = `Posts state history from server doesn't match onchain history`;
          tries++;
          await delay(DELAY);
          continue;
        }
        
        const calculatedPostsHistoryHashedState = Poseidon.hash([
          Field(historicPostsState.allPostsCounter),
          Field(BigInt(historicPostsState.userPostsCounter)),
          Field(BigInt(historicPostsState.posts)),
        ]);

        if (calculatedPostsHistoryHashedState.toString() !== historicPostsState.hashedState) {
          errorMessage = `Invalid posts state history values from server`;
          tries++;
          await delay(DELAY);
          continue;
        }

        // REACTIONS
        const reactionsAudit = await fetch(`/reactions/audit`
          +`?atBlockHeight=${itemsMetadata.lastReactionsState.atBlockHeight}`,
          {
            headers: {'Cache-Control': 'no-cache'}
          }
        );
        const dataReactions = await reactionsAudit.json();
        historicReactionsState = dataReactions.historicReactionsState;
        const historicReactionsStateWitness = MerkleMapWitness.fromJSON(JSON.parse(dataReactions.historicReactionsStateWitness));
        const [calculatedReactionsHistoryRoot, calculatedReactionsHistoryKey] =
          historicReactionsStateWitness.computeRootAndKeyV2(Field(historicReactionsState.hashedState));

        if (calculatedReactionsHistoryKey.toString() !== itemsMetadata.lastReactionsState.atBlockHeight) {
          errorMessage = `Block height ${calculatedReactionsHistoryKey.toString()} from server response doesn't`
              + ` match the requested reactions state history block height ${itemsMetadata.lastReactionsState.atBlockHeight}`;
          tries++;
          await delay(DELAY);
          continue;
        }
        
        let reactionsAppState = await fetchContractData(reactionsContractAddress);
        const onchainReactionsHistoryRoot = reactionsAppState![5].toString();

        if (calculatedReactionsHistoryRoot.toString() !== onchainReactionsHistoryRoot) {
          errorMessage = `Reactions state history from server doesn't match onchain history`;
          tries++;
          await delay(DELAY);
          continue;
        }
        
        const calculatedReactionsHistoryHashedState = Poseidon.hash([
          Field(historicReactionsState.allReactionsCounter),
          Field(BigInt(historicReactionsState.userReactionsCounter)),
          Field(BigInt(historicReactionsState.targetsReactionsCounters)),
          Field(BigInt(historicReactionsState.reactions)),
        ]);
        
        if (calculatedReactionsHistoryHashedState.toString() !== historicReactionsState.hashedState) {
          errorMessage = `Invalid reactions state history values from server`;
          tries++;
          await delay(DELAY);
          continue;
        }

        // COMMENTS
        const commentsAudit = await fetch(`/comments/audit`
          +`?atBlockHeight=${itemsMetadata.lastCommentsState.atBlockHeight}`,
          {
            headers: {'Cache-Control': 'no-cache'}
          }
        );
        const dataComments = await commentsAudit.json();
        historicCommentsState = dataComments.historicCommentsState;
        const historicCommentsStateWitness = MerkleMapWitness.fromJSON(JSON.parse(dataComments.historicCommentsStateWitness));
        const [calculatedCommentsHistoryRoot, calculatedCommentsHistoryKey] =
          historicCommentsStateWitness.computeRootAndKeyV2(Field(historicCommentsState.hashedState));

        if (calculatedCommentsHistoryKey.toString() !== itemsMetadata.lastCommentsState.atBlockHeight) {
          errorMessage = `Block height ${calculatedCommentsHistoryKey.toString()} from server response doesn't`
              + ` match the requested comments state history block height ${itemsMetadata.lastCommentsState.atBlockHeight}`;
          tries++;
          await delay(DELAY);
          continue;
        }

        let commentsAppState = await fetchContractData(commentsContractAddress);
        const onchainCommentsHistoryRoot = commentsAppState![5].toString();

        if (calculatedCommentsHistoryRoot.toString() !== onchainCommentsHistoryRoot) {
          errorMessage = `Comments state history from server doesn't match onchain history`;
          tries++;
          await delay(DELAY);
          continue;
        }

        const calculatedCommentsHistoryHashedState = Poseidon.hash([
          Field(historicCommentsState.allCommentsCounter),
          Field(BigInt(historicCommentsState.userCommentsCounter)),
          Field(BigInt(historicCommentsState.targetsCommentsCounters)),
          Field(BigInt(historicCommentsState.comments)),
        ]);

        if (calculatedCommentsHistoryHashedState.toString() !== historicCommentsState.hashedState) {
          errorMessage = `Invalid comments state history values from server`;
          tries++;
          await delay(DELAY);
          continue;
        }

        // REPOSTS
        const repostsAudit = await fetch(`/reposts/audit`
          +`?atBlockHeight=${itemsMetadata.lastRepostsState.atBlockHeight}`,
          {
            headers: {'Cache-Control': 'no-cache'}
          }
        );
        const dataReposts = await repostsAudit.json();
        historicRepostsState = dataReposts.historicRepostsState;
        const historicRepostsStateWitness = MerkleMapWitness.fromJSON(JSON.parse(dataReposts.historicRepostsStateWitness));
        const [calculatedRepostsHistoryRoot, calculatedRepostsHistoryKey] =
          historicRepostsStateWitness.computeRootAndKeyV2(Field(historicRepostsState.hashedState));

        if (calculatedRepostsHistoryKey.toString() !== itemsMetadata.lastRepostsState.atBlockHeight) {
          errorMessage = `Block height ${calculatedRepostsHistoryKey.toString()} from server response doesn't`
              + ` match the requested reposts state history block height ${itemsMetadata.lastRepostsState.atBlockHeight}`;
          tries++;
          await delay(DELAY);
          continue;
        }

        let repostsAppState = await fetchContractData(repostsContractAddress);
        const onchainRepostsHistoryRoot = repostsAppState![5].toString();

        if (calculatedRepostsHistoryRoot.toString() !== onchainRepostsHistoryRoot) {
          errorMessage = `Reposts state history from server doesn't match onchain history`;
          tries++;
          await delay(DELAY);
          continue;
        }

        const calculatedRepostsHistoryHashedState = Poseidon.hash([
          Field(historicRepostsState.allRepostsCounter),
          Field(BigInt(historicRepostsState.userRepostsCounter)),
          Field(BigInt(historicRepostsState.targetsRepostsCounters)),
          Field(BigInt(historicRepostsState.reposts)),
        ]);

        if (calculatedRepostsHistoryHashedState.toString() !== historicRepostsState.hashedState) {
          errorMessage = `Invalid reposts state history values from server`;
          tries++;
          await delay(DELAY);
          continue;
        }

        auditing_historic_state = false;
      }
    } else {
      while (auditing_historic_state) {
        if (tries === 10) {
          setErrorMessage(errorMessage);
          return false;
        }

        // COMMENTS
        const commentsAudit = await fetch(`/comments/audit`
          +`?atBlockHeight=${itemsMetadata.lastCommentsState.atBlockHeight}`,
          {
            headers: {'Cache-Control': 'no-cache'}
          }
        );
        const dataComments = await commentsAudit.json();
        historicCommentsState = dataComments.historicCommentsState;
        const historicCommentsStateWitness = MerkleMapWitness.fromJSON(JSON.parse(dataComments.historicCommentsStateWitness));
        const [calculatedCommentsHistoryRoot, calculatedCommentsHistoryKey] =
          historicCommentsStateWitness.computeRootAndKeyV2(Field(historicCommentsState.hashedState));

        if (calculatedCommentsHistoryKey.toString() !== itemsMetadata.lastCommentsState.atBlockHeight) {
          errorMessage = `Block height ${calculatedCommentsHistoryKey.toString()} from server response doesn't`
              + ` match the requested comments state history block height ${itemsMetadata.lastCommentsState.atBlockHeight}`;
          tries++;
          await delay(DELAY);
          continue;
        }

        let commentsAppState = await fetchContractData(commentsContractAddress);
        const onchainCommentsHistoryRoot = commentsAppState![5].toString();

        if (calculatedCommentsHistoryRoot.toString() !== onchainCommentsHistoryRoot) {
          errorMessage = `Comments state history from server doesn't match onchain history`;
          tries++;
          await delay(DELAY);
          continue;
        }

        const calculatedCommentsHistoryHashedState = Poseidon.hash([
          Field(historicCommentsState.allCommentsCounter),
          Field(BigInt(historicCommentsState.userCommentsCounter)),
          Field(BigInt(historicCommentsState.targetsCommentsCounters)),
          Field(BigInt(historicCommentsState.comments)),
        ]);

        if (calculatedCommentsHistoryHashedState.toString() !== historicCommentsState.hashedState) {
          errorMessage = `Invalid comments state history values from server`;
          tries++;
          await delay(DELAY);
          continue;
        }

        auditing_historic_state = false;
      }
    }
  
    let isValidAudit;
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

          isValidAudit = checkGap(currentIndex, nextItemState[nextIndex], contentType, setErrorMessage);
          if (!isValidAudit) return false;
      }

      const blockHeight = Number(itemState[`${lowercaseSingularCT}BlockHeight`]);

      const middleMessage = feedType === 'global' && contentType !== 'Comments'
                              ? singularCT + ' ' + allItemsCounter
                              : contentType === 'Comments'
                              ? singularCT + ' ' + targetItemsCounter
                              : 'User ' + singularCT + ' ' + usersItemsCounter;

      // Audit block range
      if (blockHeight < fromBlock || blockHeight > toBlock) {
        setErrorMessage(
          `Block-length ${blockHeight} for ${middleMessage}`
            +` isn't between the block range ${fromBlock} to ${toBlock}`
        );
        return false;
      }

      // Audit post key
      const posterAddressAsField = Poseidon.hash(postState.posterAddress.toFields());
      const calculatedPostKey = Poseidon.hash([posterAddressAsField, postState.postContentID.hash()]);
      const statedPostKey = contentType !== 'Comments' ? items[i].postKey : itemState.targetKey;
      if (calculatedPostKey.toString() !== statedPostKey.toString()) {
        setErrorMessage(
          `Post Key for ${middleMessage}`
            +` doesn't belong to Post`
        );
        return false;
      }

      // // Audit that the items match the onchain state
      const itemWitness = MerkleMapWitness.fromJSON(items[i][`${lowercaseSingularCT}Witness`]);
      const calculatedRoot = itemWitness.computeRootAndKeyV2(itemState.hash())[0].toString();
      if (
        (
          contentType === 'Posts'
            ? historicPostsState.posts
            : contentType === 'Reposts' ? historicRepostsState.reposts
            : historicCommentsState.comments
        )
        !== calculatedRoot
      ) {
        setErrorMessage(
          `${middleMessage}`
            +` has different root than zkApp state. The server may be experiencing some issues or manipulating results for your query.`
        );
        return false;
      }
  
      if (Number(itemState.deletionBlockHeight) === 0) {

        // Audit that the content matches the onchain state
        const calculatedCID = await getCID(items[i].content);
        const statedCID = contentType !== 'Comments' ? items[i].postState.postContentID : itemState.commentContentID
        if (calculatedCID !== CircuitString.fromJSON(statedCID).toString()) {
          setErrorMessage(
            `The content for ${middleMessage}`
              +` doesn't match the expected contentID. The server may be experiencing some issues or manipulating the content it shows.`
          );
          return false;
        }
  
        if (contentType !== 'Comments') {
          // Audit embedded items
          if (Number(itemsMetadata.lastReactionsState.allReactionsCounter) > 0) {
            isValidAudit =  await auditEmbeddedItems(
              items[i],
              feedType,
              'Reactions',
              itemsMetadata.lastReactionsState.reactions,
              itemsMetadata.lastReactionsState.targetsReactionsCounters,
              setErrorMessage
            );
            if (!isValidAudit) return false;
          }
          if (Number(itemsMetadata.lastCommentsState.allCommentsCounter) > 0) {
            isValidAudit =  await auditEmbeddedItems(
              items[i],
              feedType,
              'Comments',
              itemsMetadata.lastCommentsState.comments,
              itemsMetadata.lastCommentsState.targetsCommentsCounters,
              setErrorMessage
            );
            if (!isValidAudit) return false;
          }
          if (Number(itemsMetadata.lastRepostsState.allRepostsCounter) > 0) {
            isValidAudit =  await auditEmbeddedItems(
              items[i],
              feedType,
              'Reposts',
              itemsMetadata.lastRepostsState.reposts,
              itemsMetadata.lastRepostsState.targetsRepostsCounters,
              setErrorMessage
            );
            if (!isValidAudit) return false;
          }
        }
      }
    };
    return true;

  } catch (e: any) {
    console.log(e);
    return false;
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
  fetchedTargetItemsRoot: string,
  setErrorMessage: Dispatch<SetStateAction<any>>
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
    setErrorMessage(
      `The server stated that there are ${statedNumberOfEmbeddedItems} ${contentType} `
      +`for ${feedType === 'global' ? singularParentCT + ' ' + allItemsCounter : 'User ' + singularParentCT + ' ' + usersItemsCounter},`
      +` but it provided ${embeddedItems.length} ${contentType}. `
      +`The server may be experiencing some issues or manipulating the content it shows.`
    );
    return false;
  }

  // Audit that the amount of embedded items the server reports matches the onchain state
  const numberOfItemsWitness = MerkleMapWitness.fromJSON(parentItem[`numberOf${contentType}Witness`]);
  const calculatedTargetsItemsCountersRoot = numberOfItemsWitness.computeRootAndKeyV2(
    Field(statedNumberOfEmbeddedItems)
  )[0].toString();

  if (fetchedTargetItemsRoot !== calculatedTargetsItemsCountersRoot ) {
    setErrorMessage(
      `The server stated that there are ${statedNumberOfEmbeddedItems} ${contentType} for `
      +`${feedType === 'global' ? singularParentCT + ' ' + allItemsCounter : 'User ' + singularParentCT + ' ' + usersItemsCounter},`
      +` but the contract accounts for a different amount. The server may be experiencing issues or manipulating responses.`
    );
    return false;
  }

  for (let i = 0; i < embeddedItems.length; i++) {
    const stateJSON = embeddedItems[i][`${lowercaseSingularCT}State`];
    const witness = MerkleMapWitness.fromJSON(embeddedItems[i][`${lowercaseSingularCT}Witness`]);
    const state: any = (contentType === 'Reactions' ? ReactionState : contentType === 'Comments' ? CommentState : RepostState).fromJSON(stateJSON);
    const calculatedRoot = witness.computeRootAndKeyV2(state.hash())[0].toString();

    // Audit that embedded items belong to the parent item
    if (stateJSON.targetKey !== parentItem.postKey) {
      setErrorMessage(
        `${singularCT} ${stateJSON[`target${contentType}Counter`]} from `
        +`${feedType === 'global' ? singularParentCT + ' ' + allItemsCounter : 'User ' + singularParentCT + ' ' + usersItemsCounter} `
        +`doesn't belong to ${singularParentCT}`
      );
      return false;
    }

    // Audit that the embedded items match the onchain state
    if (fetchedItemsRoot !== calculatedRoot) {
      setErrorMessage(
        `${singularCT} ${stateJSON[`target${contentType}Counter`]} from `
        +`${feedType === 'global' ? singularParentCT + ' ' + allItemsCounter : 'User ' + singularParentCT + ' ' + usersItemsCounter} `
        +`has different root than zkApp state. `
        +`The server may be experiencing some issues or manipulating results for the ${contentType}s`
      );
      return false;
    }

    if (i+1 < embeddedItems.length) {
      const nextStateJSON = embeddedItems[i+1][`${lowercaseSingularCT}State`];
      const nextState: any = (contentType === 'Reactions' ? ReactionState : contentType === 'Comments' ? CommentState : RepostState).fromJSON(nextStateJSON);
      checkGap(
        state[`target${contentType}Counter`],
        nextState[`target${contentType}Counter`],
        contentType,
        setErrorMessage,
        {
          parentCounter: parentContentType === 'Reposts' ? parentItem.repostState[`allRepostsCounter`] : parentItem.postState[`allPostsCounter`],
          parentContentType: parentContentType
        }
      );
    }
  };
  return true;
}

const checkGap = (
  current: string,
  next: string,
  contentType: ContentType,
  setErrorMessage: Dispatch<SetStateAction<any>>,
  parentInfo?: {
    parentCounter: number,
    parentContentType: ContentType
  }
) => {
  // Audit that no items are being omitted
  if (Number(current) !== Number(next) + 1) {
    setErrorMessage(
      `Gap between ${contentType} ${current} and ${next}${parentInfo?.parentCounter ? `, `
        +`from ${parentInfo?.parentContentType.slice(0, -1)} ${parentInfo?.parentCounter}` : ''}. `
        +`The server may be experiencing some issues or censoring ${contentType}.`
    );
    return false;
  } else {
    return true;
  }
};

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}