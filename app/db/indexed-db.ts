import { openDB } from 'idb';

let dbPromise: any;
export async function initDB() {
    if (!dbPromise) {
        dbPromise = openDB('indexed-wrdhom', 1, {
            upgrade(db) {
            if (!db.objectStoreNames.contains('postsQueries')) {
                const store = db.createObjectStore('postsQueries', { keyPath: 'id', autoIncrement: true });
                store.createIndex('hashedQuery_atBlockHeight', ['postsAuditMetadata.hashedQuery', 'postsAuditMetadata.atBlockHeight'], { unique: false });
            }
            },
        });
    }
    return dbPromise;
};

export async function addPostsQuery (postsQuery: any) {
  const db = await initDB();
  const tx = db.transaction('postsQueries', 'readwrite');
  tx.store.put(postsQuery);
  await tx.done;
};

export async function getAllPostsQueries() {
  const db = await initDB();
  const tx = db.transaction('postsQueries', 'readonly');
  const result = await tx.store.getAll();
  await tx.done;
  return result;
};

export async function getPostsQuery(hashedQuery: string, atBlockHeight: string) {
    const db = await initDB();
    const tx = db.transaction('postsQueries', 'readonly');
    const index = tx.store.index('hashedQuery_atBlockHeight');

    const matchingEntry = await index.get([hashedQuery, atBlockHeight]);
    await tx.done;
    return matchingEntry;
}

export async function updatePostsQuery(id: number, postsQueryUpdates: any) {
    const db = await initDB();
    const tx = db.transaction('postsQueries', 'readwrite');
    
    const postsQuery = await tx.store.get(id);
    
    if (!postsQuery) {
        throw new Error('postsQuery not found');
    }
    
    const updatedPostsQuery = { ...postsQuery, ...postsQueryUpdates };
    
    await tx.store.put(updatedPostsQuery);
    await tx.done;
}

export async function getPostsQueriesCount() {
    const db = await initDB();
    const tx = db.transaction('postsQueries', 'readonly');
    const count = await tx.store.count();
    await tx.done;
    return count;
}