import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const assets = {
  '/': ['index.html', 'text/html'],
  '/index.html': ['index.html', 'text/html'],
  '/about.html': ['about.html', 'text/html'],
  '/services.html': ['services.html', 'text/html'],
  '/contact.html': ['contact.html', 'text/html'],
  '/css/style.css': ['css/style.css', 'text/css'],
  '/js/main.js': ['js/main.js', 'text/javascript']
};

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
  const asset = Object.hasOwn(assets, pathname) ? assets[pathname] : undefined;
  if (!asset) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  try {
    const body = await readFile(new URL(asset[0], import.meta.url));
    response.writeHead(200, {
      'Content-Type': `${asset[1]}; charset=utf-8`,
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
