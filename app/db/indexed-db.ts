import { openDB } from 'idb';

let dbPromise: any;
export async function initDB() {
    if (!dbPromise) {
        dbPromise = openDB('indexed-wrdhom', 1, {
            upgrade(db) {
            if (!db.objectStoreNames.contains('queries')) {
                const store = db.createObjectStore('queries', { keyPath: 'id', autoIncrement: true });
                store.createIndex(
                    'compositeHashedQuery',['compositeHashedQuery'], { unique: false });
            }
            },
        });
    }
    return dbPromise;
};

export async function addQuery (query: any, forceInit?: boolean) {
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

export async function getQuery(compositeHashedQuery: string) {
    const db = await initDB();
    const tx = db.transaction('queries', 'readonly');
    const index = tx.store.index('compositeHashedQuery');

    const matchingEntry = await index.get([compositeHashedQuery]);
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

export function deleteIndexedDB(databaseName: string) {
  dbPromise = undefined;
  const request = window.indexedDB.deleteDatabase(databaseName);
  
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve('Database deleted successfully');
    };
    
    request.onerror = (event: any) => {
      reject(`Error deleting database: ${event.target.error}`);
    };
  });
}