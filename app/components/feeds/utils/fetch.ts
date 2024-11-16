import { Dispatch, SetStateAction } from "react";
import { ContentType, EmbeddedReactions, FeedType } from '../../types';
import { addPostsQuery, getPostsQuery, getAllPostsQueries } from "@/app/db/indexed-db";

export const fetchItems = async (
    feedType: FeedType,
    contentType: ContentType,
    {
      account,
      setLoading,
      setErrorMessage,
      postsQueries,
      setPostsQueries,
      isDBLoaded,
      pastPostsQuery,
      setPastPostsQuery,
      setCurrentPostsQuery,
      profileAddress,
      howManyPosts,
      fromBlock,
      toBlock,
      setPosts,
      howManyReposts,
      fromBlockReposts,
      toBlockReposts,
      setReposts,
      howManyComments,
      fromBlockComments,
      toBlockComments,
      commentTarget,
      setComments,
      setIsDBLoaded
    }: {
      account: string[],
      setLoading: Dispatch<SetStateAction<boolean>>,
      setErrorMessage: Dispatch<SetStateAction<any>>,
      postsQueries: any[],
      setPostsQueries: Dispatch<SetStateAction<any[]>>,
      isDBLoaded: boolean,
      setIsDBLoaded: Dispatch<SetStateAction<boolean>>,
      pastPostsQuery: any;
      setPastPostsQuery: Dispatch<SetStateAction<any>>,
      setCurrentPostsQuery: Dispatch<SetStateAction<any>>,
      profileAddress?: string,
      howManyPosts?: number,
      fromBlock?: number,
      toBlock?: number,
      setPosts?: Dispatch<SetStateAction<any[]>>,
      howManyReposts?: number,
      fromBlockReposts?: number,
      toBlockReposts?: number,
      setReposts?: Dispatch<SetStateAction<any[]>>,
      howManyComments?: number,
      fromBlockComments?: number,
      toBlockComments?: number,
      commentTarget?: any,
      setComments?: Dispatch<SetStateAction<any[]>>
    }
) => {
    try {
      const endpoint = contentType === 'Posts' ? '/posts'
                                        : contentType === 'Reposts' ? '/reposts'
                                        : '/comments';

      let queryParams = contentType === 'Posts' ? `?howMany=${howManyPosts}&fromBlock=${fromBlock}`
                                          +`&toBlock=${toBlock}&currentUser=${account[0]}`
                                        : contentType === 'Reposts' ? `?howMany=${howManyReposts}&fromBlock=${fromBlockReposts}`
                                          +`&toBlock=${toBlockReposts}`
                                        : `?howMany=${howManyComments}&fromBlock=${fromBlockComments}`
                                          +`&toBlock=${toBlockComments}`;

      queryParams = feedType === 'global' ? queryParams
                                  : feedType === 'profile' ? queryParams + `&profileAddress=${profileAddress}`
                                  : queryParams + `&targetKey=${commentTarget.postKey}`;

      const response = await fetch(`${endpoint}${queryParams}`, {
        headers: {'Cache-Control': 'no-cache'}
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: any = await response.json();

      const itemsResponse = contentType === 'Posts' ? data.postsResponse
                                            : contentType === 'Reposts' ? data.repostsResponse
                                            : data.commentsResponse;

      if (itemsResponse.length === 0) {
        return;
      }

      const processedItems = itemsResponse.map((item: any) => processItem(item, contentType));

      if (contentType === 'Posts' && setPosts) {

        // Start quick audit
        const { Poseidon, Field, PublicKey, Signature } = await import('o1js');
        const serverPublicAddress = PublicKey.fromBase58(process.env.NEXT_PUBLIC_SERVER_PUBLIC_ADDRESS!);
        const howManyPostsAsField = Field(howManyPosts!);
        const fromBlockAsField = Field(fromBlock!);
        const toBlockAsField = Field(toBlock!);

        let profileAddressAsField;
        if (feedType === 'profile') {
          profileAddressAsField = Poseidon.hash(
            PublicKey.fromBase58(profileAddress!).toFields()
          );
        } else {
          profileAddressAsField = Field(0);
        }

        // Audit that the server response is signed by the server
        const severSignature = Signature.fromJSON(
          JSON.parse(data.postsAuditMetadata.severSignature)
        );
        const isSigned = severSignature.verify(serverPublicAddress, [
          Field(data.postsAuditMetadata.hashedQuery),
          Field(data.postsAuditMetadata.hashedState),
          Field(data.postsAuditMetadata.atBlockHeight)
        ]).toBoolean();
        if(!isSigned) {
          throw new Error(`Invalid signature for server response`);
        }

        // Audit that server responds with proper Posts query params
        const hashedQuery = Poseidon.hash([
          howManyPostsAsField,
          fromBlockAsField,
          toBlockAsField,
          profileAddressAsField
        ]).toString();
        if (data.postsAuditMetadata.hashedQuery !== hashedQuery) {
          throw new Error(`The server response doesn't match query for Posts`);
        }

        const currentProcessedQuery = {
          feedType: feedType,
          profileAddress: profileAddress,
          postsAuditMetadata: data.postsAuditMetadata,
          processedPosts: processedItems
        }
        if (!isDBLoaded) {

          const loadedPostsQueries = await getAllPostsQueries();
          const postsQuery = await getPostsQuery(
            data.postsAuditMetadata.hashedQuery,
            data.postsAuditMetadata.atBlockHeight
          );
          if (!postsQuery) {
            setPosts(processedItems);
            setCurrentPostsQuery({...currentProcessedQuery, ...{id: loadedPostsQueries.length+1}});
            setPostsQueries([
              ...loadedPostsQueries,
              {
                ...currentProcessedQuery,
                ...{id: loadedPostsQueries.length+1}
              }
            ]);
          } else {
            setPosts(postsQuery.processedPosts);
            setCurrentPostsQuery(postsQuery);
            setPostsQueries(loadedPostsQueries);
          }
          
          setPastPostsQuery(currentProcessedQuery);
          setIsDBLoaded(true);

        } else {
          setPosts(processedItems);

          const pastPostQueryDB = await getPostsQuery(
            pastPostsQuery.postsAuditMetadata.hashedQuery,
            pastPostsQuery.postsAuditMetadata.atBlockHeight
          );
          if (!pastPostQueryDB) {
            await addPostsQuery(pastPostsQuery);
          }

          setPastPostsQuery(currentProcessedQuery);

          const postsQuery = await getPostsQuery(
            data.postsAuditMetadata.hashedQuery,
            data.postsAuditMetadata.atBlockHeight
          );
          if (!postsQuery) {
            setCurrentPostsQuery({...currentProcessedQuery, ...{id: postsQueries.length+1}});
            setPostsQueries([...postsQueries, {...currentProcessedQuery, ...{id: postsQueries.length+1}}]);
          } else {
            setCurrentPostsQuery(postsQuery);
            if (!postsQueries[postsQuery.id-1])
              setPostsQueries([...postsQueries, postsQuery]);
          }
        }

      } else if (contentType === 'Reposts' && setReposts) {
        setReposts(processedItems);
      } else if (setComments) {
        setComments(processedItems);
      }

    } catch (e: any) {
      console.log(e);
      setLoading(false);
      setErrorMessage(e.message);
    }
  };

  const processItem = (item: any, contentType: ContentType) => {
    if (contentType !== 'Comments') {
      const postStateJSON = JSON.parse(item.postState);
      const repostStateJSON = contentType === 'Reposts' ? JSON.parse(item.repostState) : undefined;
      const shortPosterAddressEnd = postStateJSON?.posterAddress.slice(-12);
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
    } else {
      const commentStateJSON = contentType === 'Comments' ? JSON.parse(item.commentState) : undefined;
      const shortCommenterAddressEnd = commentStateJSON?.commenterAddress.slice(-12);
      return {
        commentState: commentStateJSON,
        commentWitness: JSON.parse(item.commentWitness),
        commentKey: item.commentKey,
        commentContentID: item.commentContentID,
        content: item.content,
        shortCommenterAddressEnd: shortCommenterAddressEnd
      }
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