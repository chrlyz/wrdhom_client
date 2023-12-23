'use client';

import CreatePost from '@/app/create-post';
import { useState, useEffect } from 'react';
import InstallWallet from '@/app/install-wallet';
import ConnectWallet from './connect-wallet';
import GetPosts from './get-posts';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState(['Not connected']);
  const [accountChanged, setAccountChanged] = useState(false);

  const walletConnection = () => setWalletConnected(!walletConnected);

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
      <div className="flex flex-col w-1/5 border-r">
        <div className="p-4 flex-grow">
          <h1 className="text-2xl font-bold mb-3">WrdHom: The auditable social-media platform</h1>
          <br/>
          {loading ? null : !hasWallet && <InstallWallet />}
          <p className="text-s mb-2 break-words whitespace-pre-wrap">{hasWallet ? "Your account is:\n" + account[0] : ''}</p>
          {loading ? null : hasWallet && !walletConnected && <ConnectWallet walletConnection={walletConnection}/>}
        </div>
        <div className="p-4 w-full mb-32">
          {loading ? null : walletConnected && <CreatePost />}
        </div>
      </div>
      <GetPosts walletConnected={walletConnected}/>
    </div>
  </main>
  );
}
