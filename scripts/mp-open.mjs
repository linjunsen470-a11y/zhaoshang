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
const project = path.join(root, 'mp');
const options = { windowsHide: true, timeout: 60_000 };
const execute = promisify(execFile);
function run(command) {
  if (process.platform === 'win32' && /\.(bat|cmd)$/i.test(cli)) {
    // The official launcher selects the runtime for the installed DevTools version.
    return execute('cmd.exe', ['/d', '/v:off', '/s', '/c',
      `""%WECHAT_CLI_ENTRY%" ${command} --project "%WECHAT_PROJECT_PATH%""`,
    ], {
      ...options,
      windowsVerbatimArguments: true,
      env: { ...process.env, WECHAT_CLI_ENTRY: path.resolve(cli), WECHAT_PROJECT_PATH: project },
    });
  }
  return execute(cli, [command, '--project', project], options);
}

// Opening normally does not attach automator or invoke its deprecated API probes.
if (process.argv.includes('--restart')) await run('close');
await run('open');
console.log('Opened mini-program in normal development mode.');
