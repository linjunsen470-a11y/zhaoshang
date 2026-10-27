import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = [process.env.MP_E2E_CLI_PATH,
  'C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat',
  'D:/Program Files (x86)/Tencent/wechat-dev/cli.bat',
].filter(Boolean).find(filename => fs.existsSync(filename));
if (!cli) throw new Error('WeChat DevTools CLI not found; set MP_E2E_CLI_PATH');
const cliDirectory = path.dirname(cli);
const run = command => promisify(execFile)(path.join(cliDirectory, 'node.exe'), [
  path.join(cliDirectory, 'cli.js'), command, '--project', path.join(root, 'mp'),
], { windowsHide: true, timeout: 60_000 });

// Opening normally does not attach automator or invoke its deprecated API probes.
if (process.argv.includes('--restart')) await run('close');
await run('open');
console.log('Opened mini-program in normal development mode.');
