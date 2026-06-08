import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '부동산 리서치 에이전트',
  description: 'AI 기반 경매·공매 자동 분석 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  )
}
