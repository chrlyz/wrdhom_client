export type ContentType = 'Posts' | 'Reposts' | 'Reactions' | 'Comments';
export type FeedType = 'global' | 'profile';

export type EmbeddedReactions = {
    reactionState: any,
    reactionWitness: any,
    reactionEmoji: string
  };
  
  export type EmbeddedComments = {
    commentState: any,
    commentWitness: any
  }
  
  export type EmbeddedReposts = {
    repostState: any,
    repostWitness: any
  }
  
  export type ProcessedPosts = {
    postState: any,
    postWitness: any,
    postKey: string,
    postContentID: string,
    content: string,
    shortPosterAddressEnd: string,
    allEmbeddedReactions: EmbeddedReactions[],
    filteredEmbeddedReactions: EmbeddedReactions[],
    top3Emojis: string[],
    numberOfReactions: number,
    numberOfReactionsWitness: any,
    embeddedComments: EmbeddedComments[],
    numberOfComments: number,
    numberOfCommentsWitness: any,
    numberOfNonDeletedComments: Number,
    embeddedReposts: EmbeddedReposts[],
    numberOfReposts: number,
    numberOfRepostsWitness: any,
    numberOfNonDeletedReposts: Number,
    currentUserRepostState: any | undefined,
    currentUserRepostKey: string | undefined,
    currentUserRepostWitness: any | undefined,
  };
  
  export type ProcessedReposts = {
    repostState: any,
    repostWitness: any,
    repostKey: string,
    shortReposterAddressEnd: string,
    postState: any,
    postWitness: any,
    postKey: string,
    postContentID: string,
    content: string,
    shortPosterAddressEnd: string,
    allEmbeddedReactions: EmbeddedReactions[],
    filteredEmbeddedReactions: EmbeddedReactions[],
    top3Emojis: string[],
    numberOfReactions: number,
    numberOfReactionsWitness: any,
    embeddedComments: EmbeddedComments[],
    numberOfComments: number,
    numberOfCommentsWitness: any,
    numberOfNonDeletedComments: Number,
    embeddedReposts: EmbeddedReposts[],
    numberOfReposts: number,
    numberOfRepostsWitness: any,
    numberOfNonDeletedReposts: Number
  };