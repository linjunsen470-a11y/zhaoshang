import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = path.resolve('mp');
const output = path.resolve('test-results/visual-refresh');
fs.mkdirSync(output, { recursive: true });
const compilerDir = process.env.MP_COMPILER_DIR || 'D:/Program Files (x86)/Tencent/wechat-dev/code/package.nw/node_modules/wcc-exec';
function files(dir, extension) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const relative = (dir ? dir + '/' : '') + entry.name;
    return entry.isDirectory() ? files(relative, extension) : entry.name.endsWith(extension) ? [relative] : [];
  });
}
for (const [compiler, extension] of [['wcc', '.wxml'], ['wcsc', '.wxss']]) {
  execFileSync(path.join(compilerDir, compiler + '.exe'), ['-o', path.join(output, compiler + '-compiled.js'), ...files('', extension)], { cwd: root, windowsHide: true, stdio: 'pipe' });
  console.log(compiler + ': all ' + extension + ' compiled successfully');
}
