// Isolated test runner: retains credentials in memory and never prints the URI.
import { loadEnvFile } from 'node:process'
import { spawn } from 'node:child_process'
try { loadEnvFile(new URL('../.env', import.meta.url)) } catch (error) { if (error.code !== 'ENOENT') throw error }
if (!process.env.DATABASE_URI) throw new Error('DATABASE_URI required for local test credentials')
const uri = new URL(process.env.DATABASE_URI)
uri.hostname = '127.0.0.1'
uri.pathname = '/zhaoshang_commercial_test_20260922'
process.env.DATABASE_URI = uri.toString()
process.env.PAYLOAD_DB_PUSH = 'false'
process.env.PAYLOAD_PUBLIC_SERVER_URL = 'http://127.0.0.1:3100'
process.env.WECHAT_AUTH_MODE = 'dev'
const child = spawn(process.execPath, process.argv.slice(2), { stdio: 'inherit', env: process.env })
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code || 0 })
