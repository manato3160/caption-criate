import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'キャプション生成ツール | トワニー',
  description: 'Instagram投稿用キャプション生成ツール',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}

