import { openDB } from 'idb';

let dbPromise: any;
export async function initDB() {
    if (!dbPromise) {
        dbPromise = openDB('indexed-wrdhom', 1, {
            upgrade(db) {
            if (!db.objectStoreNames.contains('queries')) {
                const store = db.createObjectStore('queries', { keyPath: 'id', autoIncrement: true });
                store.createIndex('hashedQuery_atBlockHeight', ['auditMetadata.hashedQuery', 'auditMetadata.atBlockHeight'], { unique: false });
            }
            },
        });
    }
    return dbPromise;
};

export async function addQuery (query: any) {
  const db = await initDB();
  const tx = db.transaction('queries', 'readwrite');
  tx.store.put(query);
  await tx.done;
};

export async function getAllQueries() {
  const db = await initDB();
  const tx = db.transaction('queries', 'readonly');
  const result = await tx.store.getAll();
  await tx.done;
  return result;
};

export async function getQuery(hashedQuery: string, atBlockHeight: string) {
    const db = await initDB();
    const tx = db.transaction('queries', 'readonly');
    const index = tx.store.index('hashedQuery_atBlockHeight');

    const matchingEntry = await index.get([hashedQuery, atBlockHeight]);
    await tx.done;
    return matchingEntry;
}

export async function updateQuery(id: number, queryUpdates: any) {
    const db = await initDB();
    const tx = db.transaction('queries', 'readwrite');
    
    const query = await tx.store.get(id);
    
    if (!query) {
        throw new Error('query not found');
    }
    
    const updatedQuery = { ...query, ...queryUpdates };
    
    await tx.store.put(updatedQuery);
    await tx.done;
}

export async function getQueriesCount() {
    const db = await initDB();
    const tx = db.transaction('queries', 'readonly');
    const count = await tx.store.count();
    await tx.done;
    return count;
}