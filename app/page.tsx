'use client';

import CreatePost from '@/app/create-post';
import { useState, useEffect } from 'react';
import InstallWallet from '@/app/install-wallet';
import ConnectWallet from './connect-wallet';
import GetPosts from './get-posts';
import AppSettings from './settings';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState(['Not connected']);
  const [accountChanged, setAccountChanged] = useState(false);
  const [visibleSettings, setVisibleSettings] = useState(false);
  const [getPosts, setGetPosts] = useState(false);
  const [howManyPosts, setHowManyPosts] = useState(10);

  const walletConnection = () => setWalletConnected(!walletConnected);
  const showSettings = () => setVisibleSettings(!visibleSettings);

  useEffect(() => {
    (async () => {
      if (typeof (window as any).mina !== 'undefined') {
        setHasWallet(true);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (walletConnected) {
        const a = await (window as any).mina.requestAccounts()
          .catch(() => {
            setWalletConnected(false);
          });
        setAccount(a);
      }
    })();
  }, [walletConnected, accountChanged]);

  useEffect(() => {
    if (typeof (window as any).mina !== 'undefined') {
      (window as any).mina?.on('accountsChanged', () => {
        setAccountChanged(!accountChanged);
      });
    }
    
    return () => (window as any).mina?.off('accountsChanged');
  });

  return (
  <main>
    <div className="flex min-h-screen">
      <div className="flex flex-col w-2/5 border-r">
        <div className="p-4 flex-grow">
          <h1 className="text-2xl font-bold mb-3">WrdHom: The auditable social-media platform</h1>
          <br/>
          {loading ? null : !hasWallet && <InstallWallet />}
          <p className="mb-2 break-words">{hasWallet ? 'Your account is: ' + account[0] : ''}</p>
          {loading ? null : hasWallet && !walletConnected && <ConnectWallet walletConnection={walletConnection}/>}
          <div className="p-4">
            {loading? null : walletConnected && <AppSettings
            visibleSettings={visibleSettings}
            showSettings={showSettings}
            getPosts={getPosts}
            setGetPosts={setGetPosts}
            howManyPosts={howManyPosts}
            setHowManyPosts={setHowManyPosts}
            />}
          </div>
          <div className="flex justify-end">
            <button className="p-2 mr-2 bg-black text-white" onClick={() => setGetPosts(!getPosts)}>Get new posts</button>
          </div>
        </div>
        <div className="p-4 w-full mb-32">
          {loading ? null : walletConnected && <CreatePost />}
        </div>
      </div>
      <GetPosts getPosts={getPosts} howManyPosts={howManyPosts} />
    </div>
  </main>
  );
}
