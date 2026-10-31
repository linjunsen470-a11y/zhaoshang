import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '饭堂与商铺｜学校、园区与写字楼招租',
  description: '专注学校、工业园区、写字楼等封闭或半封闭物业，提供饭堂档口与配套商铺查询、需求匹配及顾问跟进服务。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body>{children}</body>
    </html>
  )
}
