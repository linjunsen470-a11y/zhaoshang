import '@payloadcms/next/css'
import '../admin-theme.css'
import config from '../../../payload.config'
import { RootLayout } from '@payloadcms/next/layouts'
import { serverFunction } from './actions'
import React from 'react'
import { importMap } from './importMap'

type Args = {
  children: React.ReactNode
}

const Layout = ({ children }: Args) =>
  RootLayout({
    children,
    config,
    importMap,
    serverFunction,
  })

export default Layout
