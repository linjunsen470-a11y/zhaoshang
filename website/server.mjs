import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extname, resolve } from 'node:path';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp'
};
const files = readFileSync(new URL('./public-files.txt', import.meta.url), 'utf8').trim().split(/\r?\n/);
const assets = new Map(files.map(file => ['/' + file, file]));
assets.set('/', 'index.html');

export async function serve(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let pathname;
  try {
    pathname = new URL(request.url || '/', 'http://localhost').pathname;
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bad request');
    return;
  }
  const asset = assets.get(pathname);
  if (!asset) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  try {
    const body = await readFile(new URL(asset, import.meta.url));
    response.writeHead(200, {
      'Content-Type': types[extname(asset)],
      'Content-Length': body.length,
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    console.error('Failed to read website asset', error);
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Service unavailable');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8080);
  createServer(serve).listen(port, '0.0.0.0', () => console.log(`Website listening on port ${port}`));
}
