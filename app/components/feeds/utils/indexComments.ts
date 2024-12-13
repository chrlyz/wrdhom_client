import { Dispatch, SetStateAction } from "react";
import { getAllQueries, getQuery, addQuery } from "@/app/db/indexed-db";
import { Field, Poseidon, CircuitString } from "o1js";

export const indexComments = async (
    setCurrentQuery: Dispatch<SetStateAction<any>>,
    currentQuery: any,
    setQueries: Dispatch<SetStateAction<any[]>>,
    queries: any[],
    setPastQuery: Dispatch<SetStateAction<any>>,
    pastQuery: any,
    setIsDBLoaded: Dispatch<SetStateAction<boolean>>,
    isDBLoaded: boolean,
    setComments: Dispatch<SetStateAction<any[]>>
) => {

    const compositeHashedQuery = Poseidon.hash([
      CircuitString.fromString('comments').hash(),
      Field(currentQuery.comments.auditMetadata.hashedQuery),
      Field(currentQuery.comments.auditMetadata.lastCommentsState.atBlockHeight)
    ]).toString();

    setComments(currentQuery.comments.processedItems);

    if (!isDBLoaded) {
      const loadedQueries = await getAllQueries();

      const query = await getQuery(
        compositeHashedQuery
      );
      if (!query) {
        setCurrentQuery({
          ...currentQuery,
          compositeHashedQuery: compositeHashedQuery,
          id: loadedQueries.length+1
        });
        setQueries([
            ...loadedQueries,
            {
            ...currentQuery,
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
        compositeHashedQuery: compositeHashedQuery
      });
      setIsDBLoaded(true);

    } else {

      let pastQueryDB;
      pastQueryDB = await getQuery(
          pastQuery.compositeHashedQuery
      );
      if (!pastQueryDB) await addQuery(pastQuery);

      const query = await getQuery(
        compositeHashedQuery
      );

      if (!query) {
        setCurrentQuery({
          ...currentQuery,
          compositeHashedQuery: compositeHashedQuery,
          id: queries.length+1
        });
        setQueries([
          ...queries,
          {
            ...currentQuery,
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
        compositeHashedQuery: compositeHashedQuery
      });
    }
}