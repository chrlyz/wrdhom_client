import { useRef } from 'react';
import { Dispatch, SetStateAction } from "react";

export default function DataTransferButtons({
  queries,
  setQueries
}:
{
  queries: any[],
  setQueries: Dispatch<SetStateAction<any[]>>
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadData = (data: any[]) => {
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
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        setQueries(parsedData);
      } catch (error) {
        console.error('Error parsing file:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 w-full mb-5">
    <button
      className="w-full p-2 bg-black text-white mb-3"
      onClick={() => {
        downloadData(queries);
        setQueries([]);
      }}
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