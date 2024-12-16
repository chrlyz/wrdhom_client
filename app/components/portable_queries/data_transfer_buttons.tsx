import { useRef, useEffect, useState } from 'react';
import { Dispatch, SetStateAction } from "react";
import { deleteIndexedDB, addQuery } from '@/app/db/indexed-db';

export default function DataTransferButtons({
  queries,
  setQueries,
  setLoading,
  setCurrentQuery,
  setSelectedNavigation
}:
{
  queries: any[],
  setQueries: Dispatch<SetStateAction<any[]>>,
  setLoading: Dispatch<SetStateAction<boolean>>,
  setCurrentQuery: Dispatch<SetStateAction<any>>,
  setSelectedNavigation: Dispatch<SetStateAction<boolean>>
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [areQueriesUploaded, setAreQueriesUploaded] = useState(false);

  const downloadData = async (data: any[]) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `queries_${new Date().toISOString()}.json`;
    link.click();
    
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);

    setQueries([]);
    setCurrentQuery({
      feedType: 'global',
      posts: {processedItems: []},
      reposts: {processedItems: []},
      comments: {processedItems: []}
    });
    setSelectedNavigation(true);
    await deleteIndexedDB('indexed-wrdhom');
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        setLoading(true);
        setQueries(parsedData);
      } catch (error) {
        console.error('Error parsing file:', error);
      }
    };
    reader.readAsText(file);
    setAreQueriesUploaded(true);
  };

  useEffect(() => {
    (async () => {
      if (areQueriesUploaded) {
        deleteIndexedDB('indexed-wrdhom');
        for (let i = 0; i < queries.length; i++)  {
          await addQuery(queries[i]);
        }
        setAreQueriesUploaded(false);
        setLoading(false);
        setCurrentQuery(queries[queries.length-1]);
        setSelectedNavigation(true);
      }
    })();
  }, [queries]);

  return (
    <div className="p-4 w-full mb-5">
    <button
      className="w-full p-2 bg-black text-white mb-3"
      onClick={async () => {await downloadData(queries)}}
    >
      Download Queries
    </button>
    
    <input
      ref={fileInputRef}
      type="file"
      accept=".json"
      onChange={handleUpload}
      style={{ display: 'none' }}
    />
    <button
      className="w-full p-2 bg-black text-white"
      onClick={() => fileInputRef.current?.click()}
    >
      Upload Queries
    </button>
  </div>
  );
};