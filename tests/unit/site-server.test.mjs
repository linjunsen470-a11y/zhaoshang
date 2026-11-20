import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { serve } from '../../website/server.mjs';

async function request(url, method = 'GET') {
  const response = {
    writeHead(status, headers) { this.status = status; this.headers = headers; return this; },
    end(body) { this.body = body; }
  };
  await serve({ method, url }, response);
  return response;
}

test('static website serves only its public assets and supports HEAD', async () => {
  for (const url of ['/', '/index.html', '/about.html', '/services.html', '/contact.html', '/css/style.css', '/js/main.js']) {
    const response = await request(url);
    assert.equal(response.status, 200, url);
    assert.ok(response.body.length, url);
    assert.equal(response.headers['X-Content-Type-Options'], 'nosniff');
  }
  const head = await request('/', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, undefined);
  assert.equal((await request('/README.md')).status, 404);
  assert.equal((await request('/constructor')).status, 404);
  assert.equal((await request('/%2e%2e/server.mjs')).status, 404);
  assert.equal((await request('http://[')).status, 400);
  assert.equal((await request('/', 'POST')).status, 405);
});

test('every company page serves its visible photographs from the public image list', async () => {
  for (const page of ['index', 'about', 'services', 'contact']) {
    const html = await readFile(new URL(`../../website/${page}.html`, import.meta.url), 'utf8');
    const paths = [...html.matchAll(/<img\b[^>]*src="(images\/[^"]+)"/g)].map(match => match[1]);
    assert.ok(paths.some(path => path !== 'images/jinyi.webp'), page);
    for (const path of paths) {
      const result = await request('/' + path);
      assert.equal(result.status, 200, path);
      assert.equal(result.headers['Content-Type'], 'image/webp');
      assert.equal(result.body.toString('ascii', 8, 12), 'WEBP');
    }
  }
  assert.equal((await request('/public-files.txt')).status, 404);
});
