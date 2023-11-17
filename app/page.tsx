'use client';

import CreatePost from '@/app/create-post';
import { useState, useEffect } from 'react';
import InstallWallet from '@/app/install-wallet';
import ConnectWallet from './connect-wallet';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const walletConnection = () => setWalletConnected(!walletConnected);
  const [account, setAccount] = useState(['not connected']);

  useEffect(() => {
    if ((window as any).mina !== null) {
      setHasWallet(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      if (typeof window !== 'undefined') {
        if (walletConnected) {
          const a = await (window as any).mina.requestAccounts()
            .catch(() => {
              setWalletConnected(false);
              return ['user rejected connection']
            });
          setAccount(a);
        }
      }
    })();
  }, [walletConnected]);

  console.log(account);

  return (
  <main>
    WrdHom: The auditable social-media platform
    <br/>
    {loading ? null : !hasWallet && <InstallWallet />}
    {loading ? null : hasWallet && !walletConnected && <ConnectWallet walletConnection={walletConnection}/>}
    {loading ? null : hasWallet && walletConnected && <CreatePost />}
    <br/>
    Your account is: {account[0]} 
  </main>
  )
}
