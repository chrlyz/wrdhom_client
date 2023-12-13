'use client';

import CreatePost from '@/app/create-post';
import { useState, useEffect } from 'react';
import InstallWallet from '@/app/install-wallet';
import ConnectWallet from './connect-wallet';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState(['Not connected']);
  const [accountChanged, setAccountChanged] = useState(false);

  const walletConnection = () => setWalletConnected(!walletConnected);

  useEffect(() => {
    if (typeof (window as any).mina !== 'undefined') {
      setHasWallet(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      if (walletConnected) {
        const a = await (window as any).mina.requestAccounts()
          .catch(() => {
            setWalletConnected(false);
            return ['Not connected']
          });
        setAccount(a);
      }
    })();
  }, [walletConnected, accountChanged]);

  useEffect(() => {
    if (typeof (window as any).mina !== 'undefined') {
      (window as any).mina?.on('accountsChanged', () => {
        setAccountChanged(!accountChanged);
        console.log(accountChanged);
      });
    }
    
    return () => (window as any).mina?.off('accountsChanged');
  });

  console.log(account);

  return (
  <main>
    WrdHom: The auditable social-media platform
    <br/>
    {loading ? null : !hasWallet && <InstallWallet />}
    {loading ? null : hasWallet && walletConnected && <CreatePost />}
    {hasWallet ? 'Your account is: ' + account[0] : ''}
    <br/>
    {loading ? null : hasWallet && !walletConnected && <ConnectWallet walletConnection={walletConnection}/>}
  </main>
  )
}
