const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { createFaviconService } = require('../../services/favicon');
const { createBrowserFetcher } = require('../../services/favicon/browser');
const { createNetwork } = require('../../services/favicon/network');
const { readConfig } = require('../../services/favicon/config');

const enabled = process.env.FAVICON_BROWSER_TEST === '1';

async function fixture(t) {
  const png = await sharp({
    create: { width: 32, height: 32, channels: 4, background: '#0099ffff' },
  }).png().toBuffer();
  const hits = [], logs = [];
  const server = http.createServer((req, res) => {
    hits.push({ path: req.url, cookie: req.headers.cookie || '', method: req.method });
    if (req.url === '/dynamic') {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<html><script>
        document.cookie = 'icon-session=ready; path=/';
        setTimeout(() => {
          const link = document.createElement('link');
          link.rel = 'icon'; link.href = '/private-icon.png'; document.head.append(link);
        }, 100);
      </script></html>`);
    } else if (req.url === '/private-icon.png' && req.headers.cookie?.includes('icon-session=ready')) {
      res.setHeader('Content-Type', 'image/png'); res.end(png);
    } else if (req.url === '/blob') {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<html><script>
        const bytes = Uint8Array.from(atob('${png.toString('base64')}'), c => c.charCodeAt(0));
        const link = document.createElement('link'); link.rel = 'icon';
        link.href = URL.createObjectURL(new Blob([bytes], {type: 'image/png'}));
        document.head.append(link);
      </script></html>`);
    } else if (req.url === '/slow') {
      // Deliberately never respond; the browser must be stopped by its deadline.
    } else {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flame-browser-test-'));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(cacheDir, { recursive: true, force: true });
  });
  const config = {
    ...readConfig(), cacheDir, allowLoopback: true, browserEnabled: true,
    browserWaitMs: 500, browserTimeoutMs: 6000, logger: (e) => logs.push(e),
  };
  return { config, origin: `http://127.0.0.1:${server.address().port}`, hits, logs };
}

test('real Chromium resolves script-injected cookie-protected icon, then disk cache is used',
  { skip: !enabled, timeout: 20000 }, async (t) => {
    const f = await fixture(t), service = createFaviconService(f.config);
    const result = await service.get(f.origin + '/dynamic');
    assert.equal((await sharp(result.buffer).metadata()).format, 'png');
    assert.ok(f.hits.some((h) => h.path === '/private-icon.png' && h.cookie.includes('icon-session=ready')));
    const count = f.hits.length;
    assert.equal((await service.get(f.origin + '/dynamic')).cached, true);
    assert.equal(f.hits.length, count);
    assert.deepEqual(f.logs.filter((e) => e.stage === 'browser'), []);
  });

test('real Chromium retrieves runtime blob favicon', { skip: !enabled, timeout: 20000 }, async (t) => {
  const f = await fixture(t);
  const result = await createFaviconService(f.config).get(f.origin + '/blob');
  assert.equal((await sharp(result.buffer).metadata()).width, 32);
});

test('real Chromium navigation timeout closes the process and next attempt succeeds',
  { skip: !enabled, timeout: 20000 }, async (t) => {
    const f = await fixture(t);
    const config = { ...f.config, browserTimeoutMs: 1000 };
    const fetch = createBrowserFetcher(config, createNetwork(config));
    const start = Date.now();
    await assert.rejects(fetch(f.origin + '/slow', new AbortController().signal));
    assert.ok(Date.now() - start < 8000);
    const result = await fetch(f.origin + '/dynamic', new AbortController().signal);
    assert.equal((await sharp(result).metadata()).format, 'png');
  });

test('browser launch failure degrades without failing service initialization', async (t) => {
  const f = await fixture(t);
  const service = createFaviconService({
    ...f.config, browserExecutable: '/nonexistent/flame-test-chromium',
  });
  await assert.rejects(service.get(f.origin + '/dynamic'), { code: 'ICON_NOT_FOUND' });
  assert.ok(f.logs.some((e) => e.stage === 'browser'));
});
