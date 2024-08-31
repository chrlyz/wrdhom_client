import { Dispatch, SetStateAction } from "react";
import { ContentType, EmbeddedReactions } from '../../../types';

export const fetchItems = async (
    contentType: ContentType,
    feedContext: {
        howManyPosts: number,
        fromBlock: number,
        toBlock: number,
        howManyReposts: number,
        fromBlockReposts: number,
        toBlockReposts: number,
        account: string[],
        setPosts: Dispatch<SetStateAction<any[]>>,
        setReposts: Dispatch<SetStateAction<any[]>>,
        setLoading: Dispatch<SetStateAction<boolean>>,
        setErrorMessage: Dispatch<SetStateAction<any>>
    }
) => {
    try {
      const endpoint = contentType === 'Posts' ? '/posts' : '/reposts';
      const queryParams = contentType === 'Posts' 
        ? `?howMany=${feedContext.howManyPosts}&fromBlock=${feedContext.fromBlock}`
          +`&toBlock=${feedContext.toBlock}&currentUser=${feedContext.account[0]}`
          
        : `?howMany=${feedContext.howManyReposts}&fromBlock=${feedContext.fromBlockReposts}`
          +`&toBlock=${feedContext.toBlockReposts}`;

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
        feedContext.setPosts(processedItems);
      } else {
        feedContext.setReposts(processedItems);
      }

    } catch (e: any) {
      console.log(e);
      feedContext.setLoading(false);
      feedContext.setErrorMessage(e.message);
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