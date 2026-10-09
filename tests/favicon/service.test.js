const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { createFaviconService } = require('../../services/favicon');
const { collectDocument, validateImage, dataBuffer } = require('../../services/favicon/icons');
const { readConfig } = require('../../services/favicon/config');
const { normalizeUrl, addressAllowed, createNetwork } = require('../../services/favicon/network');
const { createLimiter } = require('../../services/favicon/limiter');

const png = () => sharp({ create: { width: 32, height: 32, channels: 4, background: '#ff880080' } }).png().toBuffer();

async function fixture(t, routes, overrides = {}, dependencies = {}) {
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    const route = routes[req.url];
    if (route) route(req, res);
    else { res.writeHead(404); res.end('not found'); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flame-favicon-test-'));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(cacheDir, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const service = createFaviconService({
    cacheDir, allowLoopback: true, browserEnabled: false, logger: () => {},
    requestTimeoutMs: 200, staticTimeoutMs: 1500, totalTimeoutMs: 2500,
    ...overrides,
  }, dependencies);
  return { service, origin, hits, cacheDir };
}
const html = (body) => (_, res) => { res.setHeader('Content-Type', 'text/html'); res.end(body); };
const image = (buffer) => (_, res) => { res.setHeader('Content-Type', 'image/png'); res.end(buffer); };

test('HTML parser: entities, base, rel tokens, ordering and equal-size tie', () => {
  const result = collectDocument(`
    <base href="/app/assets/">
    <link href='touch.png' rel='apple-touch-icon'>
    <link href='first.png' sizes='32x32' rel='icon shortcut'>
    <link href = "logo.png?a=1&amp;b=2" sizes='32x32' rel = "ICON">
    <link href=large.png sizes=180x180 rel=icon>
  `, 'https://site.example/login/index.html');
  assert.deepEqual(result.primary, [
    'https://site.example/app/assets/logo.png?a=1&b=2',
    'https://site.example/app/assets/first.png',
    'https://site.example/app/assets/large.png',
  ]);
  assert.equal(result.secondary[0], 'https://site.example/app/assets/touch.png');
});

test('invalid href does not discard later candidates', () => {
  const doc = collectDocument('<link rel=icon href="http://["><link rel=icon href="ok.png">', 'https://site.example/app/');
  assert.deepEqual(doc.primary, ['https://site.example/app/ok.png']);
});

test('reject credentials, unsupported schemes, loopback and metadata addresses', () => {
  for (const value of [undefined, ['https://a.test'], 'file:///etc/passwd', 'http://user:pass@site.test', 'javascript:alert(1)']) {
    assert.throws(() => normalizeUrl(value));
  }
  const config = readConfig({});
  for (const address of ['127.0.0.1', '::1', '169.254.169.254', '0.0.0.0', '224.0.0.1', '::ffff:127.0.0.1']) {
    assert.equal(addressAllowed(address, config), false, address);
  }
  assert.equal(addressAllowed('192.168.60.100', config), true);
  assert.equal(addressAllowed('192.168.60.100', { ...config, allowPrivate: false }), false);
});

test('full image decoding rejects HTML, truncated images and external SVG references', async () => {
  const config = readConfig({});
  await assert.rejects(validateImage(Buffer.from('<html>login</html>'), config));
  const valid = await png();
  await assert.rejects(validateImage(valid.subarray(0, 40), config));
  await assert.rejects(validateImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><image href="file:///etc/passwd"/></svg>'), config));
  const output = await validateImage(valid, config);
  const meta = await sharp(output).metadata();
  assert.equal(meta.format, 'png');
  assert.equal(meta.hasAlpha, true);
});

test('data URL SVG is decoded and safely rasterized', async () => {
  const data = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="8" fill="red"/></svg>');
  const config = readConfig({});
  const output = await validateImage(dataBuffer(data, config.maxBytes), config);
  assert.equal((await sharp(output).metadata()).format, 'png');
});

test('ICO frames decode to PNG', async () => {
  const image = await png();
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  header[6] = 32; header[7] = 32;
  header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
  header.writeUInt32LE(image.length, 14); header.writeUInt32LE(22, 18);
  const output = await validateImage(Buffer.concat([header, image]), readConfig({}));
  assert.equal((await sharp(output).metadata()).width, 32);
});

test('redirected page + relative path; tab icon wins; successful cache reused', async (t) => {
  const p = await png();
  const f = await fixture(t, {
    '/': (_, res) => { res.writeHead(302, { Location: '/app/index.html' }); res.end(); },
    '/app/index.html': html('<link rel=apple-touch-icon href=/touch.png><link rel=icon href=icons/site.png>'),
    '/app/icons/site.png': image(p),
    '/touch.png': image(p),
  });
  assert.equal((await f.service.get(f.origin)).cached, false);
  assert.equal((await f.service.get(f.origin)).cached, true);
  assert.deepEqual(f.hits, ['/', '/app/index.html', '/app/icons/site.png']);
});

test('200 HTML is not cached and next declared icon is attempted', async (t) => {
  const p = await png();
  const f = await fixture(t, {
    '/': html('<link rel=icon sizes=64x64 href=/good.png><link rel=icon sizes=32x32 href=/bad.ico>'),
    '/bad.ico': html('<html>login</html>'),
    '/good.png': image(p),
  });
  await f.service.get(f.origin);
  assert.deepEqual(f.hits, ['/', '/bad.ico', '/good.png']);
  const files = await fs.readdir(f.cacheDir);
  assert.equal(files.length, 1);
  assert.equal((await sharp(await fs.readFile(path.join(f.cacheDir, files[0]))).metadata()).format, 'png');
});

test('manifest relative icons, touch/brand fallback without browser', async (t) => {
  const p = await png();
  const f = await fixture(t, {
    '/': html('<link rel=manifest href=/app/site.webmanifest>'),
    '/app/site.webmanifest': (_, res) => res.end(JSON.stringify({ icons: [{ src: 'icon.png', sizes: '48x48' }] })),
    '/app/icon.png': image(p),
  });
  await f.service.get(f.origin);
  assert.ok(f.hits.includes('/app/icon.png'));
});

test('browser invoked only after lightweight failure and only if HTML reachable', async (t) => {
  let calls = 0;
  const p = await png();
  const f = await fixture(t, { '/': html('<html><script>/* dynamic */</script></html>') },
    { browserEnabled: true }, { browserFetch: async () => { calls++; return p; } });
  await f.service.get(f.origin);
  assert.equal(calls, 1);
  const g = await fixture(t, {}, { browserEnabled: true }, { browserFetch: async () => { calls++; return p; } });
  await assert.rejects(g.service.get(g.origin), { code: 'ICON_NOT_FOUND' });
  assert.equal(calls, 1);
});

test('unreachable site skips browser; negative cache expires; no file written', async (t) => {
  let requests = 0, browsers = 0;
  const f = await fixture(t, {}, { browserEnabled: true, negativeTtlMs: 20 }, {
    network: {
      checkUrl: async () => {},
      get: async () => { requests++; throw Object.assign(new Error(), { code: 'ECONNREFUSED' }); },
    },
    browserFetch: async () => { browsers++; },
  });
  await assert.rejects(f.service.get(f.origin), { code: 'HOST_UNREACHABLE' });
  const first = requests;
  await assert.rejects(f.service.get(f.origin));
  assert.equal(requests, first);
  await new Promise((resolve) => setTimeout(resolve, 30));
  await assert.rejects(f.service.get(f.origin));
  assert.ok(requests > first);
  assert.equal(browsers, 0);
  assert.deepEqual(await fs.readdir(f.cacheDir), []);
});

test('same URL concurrent requests coalesce, full paths use separate cache keys', async (t) => {
  const p = await png();
  const f = await fixture(t, {
    '/a': html('<link rel=icon href=/good.png>'),
    '/b': html('<link rel=icon href=/good.png>'),
    '/good.png': image(p),
  });
  await Promise.all(Array.from({ length: 8 }, () => f.service.get(f.origin + '/a')));
  assert.equal(f.hits.filter((p) => p === '/a').length, 1);
  await f.service.get(f.origin + '/b');
  assert.equal((await fs.readdir(f.cacheDir)).length, 2);
});

test('expired and corrupt caches are reacquired without touching legacy files', async (t) => {
  const p = await png();
  const f = await fixture(t, { '/': html('<link rel=icon href=/good.png>'), '/good.png': image(p) });
  await f.service.get(f.origin);
  const [name] = await fs.readdir(f.cacheDir), filename = path.join(f.cacheDir, name);
  await fs.utimes(filename, new Date(0), new Date(0));
  assert.equal((await f.service.get(f.origin)).cached, false);
  await fs.writeFile(filename, '<html>bad</html>');
  assert.equal((await f.service.get(f.origin)).cached, false);
  assert.equal(f.hits.filter((p) => p === '/').length, 3);
});

test('network bounds redirects, response size and deadline', async (t) => {
  const f = await fixture(t, {
    '/loop': (_, res) => { res.writeHead(302, { Location: '/loop' }); res.end(); },
    '/large': (_, res) => res.end('x'.repeat(2048)),
    '/slow': () => {},
  });
  const network = createNetwork({ ...readConfig({}), allowLoopback: true, maxBytes: 1024, requestTimeoutMs: 50 });
  await assert.rejects(network.get(f.origin + '/loop'), { code: 'REDIRECT_LIMIT' });
  await assert.rejects(network.get(f.origin + '/large'));
  await assert.rejects(network.get(f.origin + '/slow'));
});

test('limiter bounds concurrency and cancels queued work', async () => {
  const limit = createLimiter(1, 1);
  let release;
  const first = limit(() => new Promise((resolve) => { release = resolve; }));
  const controller = new AbortController();
  const second = limit(async () => assert.fail('cancelled task ran'), controller.signal);
  await assert.rejects(limit(async () => {}), { code: 'BUSY' });
  controller.abort();
  await assert.rejects(second, { code: 'DEADLINE' });
  release();
  await first;
  assert.equal(await limit(async () => 1), 1);
});

test('custom API logo remains a validated last fallback', async (t) => {
  const p = await png();
  const f = await fixture(t, {
    '/': html('<html>custom app</html>'),
    '/api/status': (_, res) => res.end(JSON.stringify({ data: { logo: `data:image/png;base64,${p.toString('base64')}` } })),
  });
  const result = await f.service.get(f.origin);
  assert.equal((await sharp(result.buffer).metadata()).format, 'png');
  assert.equal(f.hits[f.hits.length - 1], '/api/status');
});
