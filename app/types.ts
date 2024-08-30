export type ContentType = 'Posts' | 'Reposts' | 'Reactions' | 'Comments';
export type FeedType = 'global' | 'profile';

export type EmbeddedReactions = {
    reactionState: any,
    reactionWitness: JSON,
    reactionEmoji: string
  };
  
  export type EmbeddedComments = {
    commentState: JSON,
    commentWitness: JSON
  }
  
  export type EmbeddedReposts = {
    repostState: JSON,
    repostWitness: JSON
  }
  
  export type ProcessedPosts = {
    postState: JSON,
    postWitness: JSON,
    postKey: string,
    postContentID: string,
    content: string,
    shortPosterAddressEnd: string,
    allEmbeddedReactions: EmbeddedReactions[],
    filteredEmbeddedReactions: EmbeddedReactions[],
    top3Emojis: string[],
    numberOfReactions: number,
    numberOfReactionsWitness: JSON,
    embeddedComments: EmbeddedComments[],
    numberOfComments: number,
    numberOfCommentsWitness: JSON,
    numberOfNonDeletedComments: Number,
    embeddedReposts: EmbeddedReposts[],
    numberOfReposts: number,
    numberOfRepostsWitness: JSON,
    numberOfNonDeletedReposts: Number,
    currentUserRepostState: JSON | undefined,
    currentUserRepostKey: string | undefined,
    currentUserRepostWitness: JSON | undefined,
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
    allEmbeddedReactions: EmbeddedReactions[],
    filteredEmbeddedReactions: EmbeddedReactions[],
    top3Emojis: string[],
    numberOfReactions: number,
    numberOfReactionsWitness: JSON,
    embeddedComments: EmbeddedComments[],
    numberOfComments: number,
    numberOfCommentsWitness: JSON,
    numberOfNonDeletedComments: Number,
    embeddedReposts: EmbeddedReposts[],
    numberOfReposts: number,
    numberOfRepostsWitness: JSON,
    numberOfNonDeletedReposts: Number
  };