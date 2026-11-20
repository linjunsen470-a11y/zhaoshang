import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '锦奕｜商铺选址与餐饮对接',
  description: '广州锦奕咨询服务有限公司提供商铺选址与企业用餐对接服务。在微信搜索小程序「岭南旺铺」了解铺位详情。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
