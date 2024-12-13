import { Dispatch, SetStateAction } from "react";
import { getAllQueries, getQuery, addQuery } from "@/app/db/indexed-db";
import { Field, Poseidon, CircuitString } from "o1js";

export const indexPostsAndReposts = async (
  setCurrentQuery: Dispatch<SetStateAction<any>>,
  currentQuery: any,
  setQueries: Dispatch<SetStateAction<any[]>>,
  queries: any[],
  setPastQuery: Dispatch<SetStateAction<any>>,
  pastQuery: any,
  setIsDBLoaded: Dispatch<SetStateAction<boolean>>,
  isDBLoaded: boolean,
  setMergedContent: Dispatch<SetStateAction<any[]>>
) => {

      const getCompositeHashedQuery = (currentQuery: any) => {
        let compositeHashedQuery = '';
        if (
          currentQuery.posts.processedItems.length > 0
          && currentQuery.reposts.processedItems.length > 0
        ) {
          compositeHashedQuery = Poseidon.hash([
            CircuitString.fromString('composite').hash(),
            Field(currentQuery.posts.auditMetadata.hashedQuery),
            Field(currentQuery.posts.auditMetadata.lastPostsState.atBlockHeight),
            Field(currentQuery.reposts.auditMetadata.hashedQuery),
            Field(currentQuery.reposts.auditMetadata.lastRepostsState.atBlockHeight)
          ]).toString();
        } else if (currentQuery.posts.processedItems.length > 0) {
          compositeHashedQuery = Poseidon.hash([
            CircuitString.fromString('posts').hash(),
            Field(currentQuery.posts.auditMetadata.hashedQuery),
            Field(currentQuery.posts.auditMetadata.lastPostsState.atBlockHeight)
          ]).toString();
        } else if (currentQuery.reposts.processedItems.length > 0) {
          compositeHashedQuery = Poseidon.hash([
            CircuitString.fromString('reposts').hash(),
            Field(currentQuery.reposts.auditMetadata.hashedQuery),
            Field(currentQuery.reposts.auditMetadata.lastRepostsState.atBlockHeight)
          ]).toString();
        }
        return compositeHashedQuery;
      }

      const mergeAndSort = (posts: any[], reposts: any[]) => {
        const merged = [...posts, ...reposts];
        const filteredByDeletedPosts = merged.filter(element => Number(element.postState.deletionBlockHeight) === 0);
        const filteredByDeletedReposts = filteredByDeletedPosts.filter(element => element.repostState === undefined ?
                                                                  true : Number(element.repostState.deletionBlockHeight) === 0);
        const sorted = filteredByDeletedReposts.sort((a,b) => {
          const blockHeightA =  a.repostState === undefined ? a.postState.postBlockHeight : a.repostState.repostBlockHeight;
          const blockHeightB =  b.repostState === undefined ? b.postState.postBlockHeight : b.repostState.repostBlockHeight;
          return blockHeightB - blockHeightA;
        });
        return sorted;
      }

      const mergedAndSorted = mergeAndSort(
        currentQuery.posts.processedItems,
        currentQuery.reposts.processedItems
      );
      setMergedContent(mergedAndSorted);
    
      if (!isDBLoaded) {
        const loadedQueries = await getAllQueries();

        const compositeHashedQuery = getCompositeHashedQuery(currentQuery);

        const query = await getQuery(
          compositeHashedQuery
        );
        if (!query) {
          setCurrentQuery({
            ...currentQuery,
            mergedAndSorted: mergedAndSorted,
            compositeHashedQuery: compositeHashedQuery,
            id: loadedQueries.length+1
          });
          setQueries([
              ...loadedQueries,
              {
              ...currentQuery,
              mergedAndSorted: mergedAndSorted,
              compositeHashedQuery: compositeHashedQuery,
              id: loadedQueries.length+1
              }
          ]);
        } else {
          setCurrentQuery(query);
          setQueries(loadedQueries);
        }
        
        setPastQuery({
          ...currentQuery,
          mergedAndSorted: mergedAndSorted,
          compositeHashedQuery: compositeHashedQuery
        });
        setIsDBLoaded(true);

      } else {

        let pastQueryDB;
        pastQueryDB = await getQuery(
            pastQuery.compositeHashedQuery
        );
        if (!pastQueryDB) await addQuery(pastQuery);

        const compositeHashedQuery = getCompositeHashedQuery(currentQuery);

        const query = await getQuery(
          compositeHashedQuery
        );

        if (!query) {
          setCurrentQuery({
            ...currentQuery,
            mergedAndSorted: mergedAndSorted,
            compositeHashedQuery: compositeHashedQuery,
            id: queries.length+1
          });
          setQueries([
            ...queries,
            {
              ...currentQuery,
              mergedAndSorted: mergedAndSorted,
              compositeHashedQuery: compositeHashedQuery,
              id: queries.length+1
            }
          ]);
        } else {
          setCurrentQuery(query);
          if (!queries[query.id-1]) setQueries([...queries, query]);
        }

        setPastQuery({
          ...currentQuery,
          mergedAndSorted: mergedAndSorted,
          compositeHashedQuery: compositeHashedQuery
        });

      }
  }