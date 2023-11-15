'use client';

import CreatePost from '@/app/create-post';
import { useEffect } from 'react';

export default function Home() {

  useEffect(() => {
    const mina = (window as any).mina;
    if (mina == null) {
      console.log("No Mina!");
    } else {
      console.log("Mina!");
    }
  })

  return (
  <main>
    WrdHom: The auditable social-media platform
    <CreatePost />
  </main>
  )
  
}
