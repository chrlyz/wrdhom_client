import { Dispatch, SetStateAction } from "react";
import { ContentType, EmbeddedReactions, FeedType } from '../../types';
import { addQuery, getQuery, getAllQueries } from "@/app/db/indexed-db";

export const fetchItems = async (
    feedType: FeedType,
    contentType: ContentType,
    {
      account,
      setLoading,
      setErrorMessage,
      queries,
      setQueries,
      isDBLoaded,
      pastQuery,
      setPastQuery,
      setCurrentQuery,
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
      queries: any[],
      setQueries: Dispatch<SetStateAction<any[]>>,
      isDBLoaded: boolean,
      setIsDBLoaded: Dispatch<SetStateAction<boolean>>,
      pastQuery: any;
      setPastQuery: Dispatch<SetStateAction<any>>,
      setCurrentQuery: Dispatch<SetStateAction<any>>,
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
          JSON.parse(data.auditMetadata.severSignature)
        );
        const isSigned = severSignature.verify(serverPublicAddress, [
          Field(data.auditMetadata.hashedQuery),
          Field(data.auditMetadata.hashedState),
          Field(data.auditMetadata.atBlockHeight),
          Field(data.auditMetadata.lastReactionsState.hashedState),
          Field(data.auditMetadata.lastReactionsState.atBlockHeight),
          Field(data.auditMetadata.lastCommentsState.hashedState),
          Field(data.auditMetadata.lastCommentsState.atBlockHeight),
          Field(data.auditMetadata.lastRepostsState.hashedState),
          Field(data.auditMetadata.lastRepostsState.atBlockHeight)
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
        if (data.auditMetadata.hashedQuery !== hashedQuery) {
          throw new Error(`The server response doesn't match query for Posts`);
        }

        const currentProcessedQuery = {
          feedType: feedType,
          profileAddress: profileAddress,
          auditMetadata: data.auditMetadata,
          processedItems: processedItems
        }
        if (!isDBLoaded) {

          const loadedQueries = await getAllQueries();
          const query = await getQuery(
            currentProcessedQuery.auditMetadata.hashedQuery,
            currentProcessedQuery.auditMetadata.atBlockHeight
          );
          if (!query) {
            setPosts(processedItems);
            setCurrentQuery({...currentProcessedQuery, ...{id: loadedQueries.length+1}});
            setQueries([
              ...loadedQueries,
              {
                ...currentProcessedQuery,
                ...{id: loadedQueries.length+1}
              }
            ]);
          } else {
            setPosts(query.processedItems);
            setCurrentQuery(query);
            setQueries(loadedQueries);
          }
          
          setPastQuery(currentProcessedQuery);
          setIsDBLoaded(true);

        } else {
          setPosts(processedItems);

          let pastQueryDB;
          if (pastQuery.feedType !== 'comments') {
            pastQueryDB = await getQuery(
              pastQuery.auditMetadata.hashedQuery,
              pastQuery.auditMetadata.atBlockHeight
            );
          } else {
            pastQueryDB = await getQuery(
              pastQuery.auditMetadata.hashedQuery,
              pastQuery.auditMetadata.lastCommentsState.atBlockHeight
            );
          }

          if (!pastQueryDB) {
            if (pastQuery.feedType !== 'comments') {
              await addQuery(pastQuery);
            } else {
              pastQuery.auditMetadata.atBlockHeight
                = pastQuery.auditMetadata.lastCommentsState.atBlockHeight;
              await addQuery(pastQuery);
            }
          }

          const query = await getQuery(
            currentProcessedQuery.auditMetadata.hashedQuery,
            currentProcessedQuery.auditMetadata.atBlockHeight
          );

          if (!query) {
            setCurrentQuery({...currentProcessedQuery, ...{id: queries.length+1}});
            setQueries([...queries, {...currentProcessedQuery, ...{id: queries.length+1}}]);
          } else {
            setCurrentQuery(query);
            if (!queries[query.id-1])
              setQueries([...queries, query]);
          }

          setPastQuery(currentProcessedQuery);
        }

      } else if (contentType === 'Reposts' && setReposts) {

        setReposts(processedItems);

      } else if (contentType === 'Comments' && setComments) {

        // Start quick audit
        const { Poseidon, Field, PublicKey, Signature } = await import('o1js');
        const serverPublicAddress = PublicKey.fromBase58(process.env.NEXT_PUBLIC_SERVER_PUBLIC_ADDRESS!);
        const howManyCommentsAsField = Field(howManyComments!);
        const fromBlockAsField = Field(fromBlockComments!);
        const toBlockAsField = Field(toBlockComments!);

        // Audit that the server response is signed by the server
        const severSignature = Signature.fromJSON(
          JSON.parse(data.auditMetadata.severSignature)
        );
        const isSigned = severSignature.verify(serverPublicAddress, [
          Field(data.auditMetadata.hashedQuery),
          Field(data.auditMetadata.lastCommentsState.hashedState),
          Field(data.auditMetadata.lastCommentsState.atBlockHeight)
        ]).toBoolean();
        if(!isSigned) {
          throw new Error(`Invalid signature for server response`);
        }

        // Audit that server responds with proper Comments query params
        const hashedQuery = Poseidon.hash([
          howManyCommentsAsField,
          fromBlockAsField,
          toBlockAsField
        ]).toString();
        if (data.auditMetadata.hashedQuery !== hashedQuery) {
          throw new Error(`The server response doesn't match query for Comments`);
        }

        const currentProcessedQuery = {
          feedType: feedType,
          auditMetadata: data.auditMetadata,
          processedItems: processedItems
        }
        currentProcessedQuery.auditMetadata.atBlockHeight
        = pastQuery.auditMetadata.lastCommentsState.atBlockHeight;
        if (!isDBLoaded) {

          const loadedQueries = await getAllQueries();
          const query = await getQuery(
            currentProcessedQuery.auditMetadata.hashedQuery,
            currentProcessedQuery.auditMetadata.lastCommentsState.atBlockHeight
          );
          if (!query) {
            setComments(processedItems);
            setCurrentQuery({
              ...currentProcessedQuery,
              ...{
                id: loadedQueries.length+1,
                commentsTarget: commentTarget
              }
            });
            setQueries([
              ...loadedQueries,
              {
                ...currentProcessedQuery,
                ...{
                  id: loadedQueries.length+1,
                  commentsTarget: commentTarget
                }
              }
            ]);
          } else {
            setComments(query.processedItems);
            setCurrentQuery(query);
            setQueries(loadedQueries);
          }
          
          setPastQuery(currentProcessedQuery);
          setIsDBLoaded(true);

        } else {
          setComments(processedItems);

          let pastQueryDB;
          if (pastQuery.feedType !== 'comments') {
            pastQueryDB = await getQuery(
              pastQuery.auditMetadata.hashedQuery,
              pastQuery.auditMetadata.atBlockHeight
            );
          } else {
            pastQueryDB = await getQuery(
              pastQuery.auditMetadata.hashedQuery,
              pastQuery.auditMetadata.lastCommentsState.atBlockHeight
            );
          }

          if (!pastQueryDB) {
            if (pastQuery.feedType !== 'comments') {
              await addQuery(pastQuery);
            } else {
              await addQuery(pastQuery);
            }
          }

          const query = await getQuery(
            currentProcessedQuery.auditMetadata.hashedQuery,
            currentProcessedQuery.auditMetadata.lastCommentsState.atBlockHeight
          );
          if (!query) {
            setCurrentQuery({
              ...currentProcessedQuery,
              ...{
                id: queries.length+1,
                commentsTarget: commentTarget
              }
            });
            setQueries([...queries, {
              ...currentProcessedQuery,
              ...{
                id: queries.length+1,
                commentsTarget: commentTarget
              }
            }]);
          } else {
            setCurrentQuery(query);
            if (!queries[query.id-1])
              setQueries([...queries, query]);
          }

          setPastQuery(currentProcessedQuery);
        }
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