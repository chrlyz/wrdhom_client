'use client';

import CreatePost from '@/app/create-post';
import { useState, useEffect } from 'react';
import InstallWallet from '@/app/install-wallet';

export default function Home() {
  const [hasWallet, setHasWallet] = useState(null as null | boolean);

  useEffect(() => {
    const mina = (window as any).mina;
    if (mina == null) {
      setHasWallet(false);
    } else {
      setHasWallet(true);
    }
  }, []);

  return (
  <main>
    WrdHom: The auditable social-media platform
    <InstallWallet hasWallet={hasWallet} />
    <CreatePost />
  </main>
  )
}
