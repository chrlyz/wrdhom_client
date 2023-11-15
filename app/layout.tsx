import type { Metadata } from 'next'
import { Press_Start_2P } from 'next/font/google'
import './globals.css'

const pstart = Press_Start_2P({weight: "400", preload: false});

export const metadata: Metadata = {
  title: 'WrdHom',
  description: 'The auditable social-media platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={pstart.className}>{children}</body>
    </html>
  )
}
