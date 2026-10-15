import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '商业空间招商服务',
  description: '商铺招商、店铺转让与设备供需服务，为餐饮、零售及校园服务商户提供项目查询和顾问对接。',
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
