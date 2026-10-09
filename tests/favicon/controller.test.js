const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeUrl } = require('../../services/favicon/network');

async function request(url, saved, result) {
  let called = 0;
  const module = { exports: {} };
  const filename = path.join(__dirname, '../../controllers/favicon/getFavicon.js');
  const model = { findAll: async () => saved.map((url) => ({ url })) };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module, require: (name) => {
      if (name === '../../middleware/asyncWrapper') return (fn) => fn;
      if (name === '../../services/favicon/network') return { normalizeUrl };
      if (name === '../../services/favicon') return {
        createFaviconService: () => ({ get: async () => {
          called++;
          if (result instanceof Error) throw result;
          return { buffer: result || Buffer.from('test') };
        } }),
      };
      if (name.startsWith('../../models/')) return model;
      throw new Error(name);
    },
  });
  const headers = {};
  const response = {
    statusCode: 200,
    setHeader(k, v) { headers[k] = v; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
  };
  await module.exports({ query: { url } }, response);
  return { called, headers, response };
}

test('unregistered or invalid URLs never invoke the browsing service', async () => {
  const unknown = await request('https://not-saved.example/', ['https://saved.example/']);
  assert.equal(unknown.called, 0);
  assert.equal(unknown.response.statusCode, 403);
  const invalid = await request(['http://invalid'], []);
  assert.equal(invalid.called, 0);
  assert.equal(invalid.response.statusCode, 400);
  assert.equal(invalid.headers['Cache-Control'], 'no-store');
});

test('saved bare hostname is normalized; PNG response has safe headers', async () => {
  const result = await request('http://saved.example/', ['saved.example']);
  assert.equal(result.called, 1);
  assert.equal(result.response.statusCode, 200);
  assert.equal(result.headers['Content-Type'], 'image/png');
  assert.equal(result.headers['X-Content-Type-Options'], 'nosniff');
});

test('busy/unreachable/not-found statuses are distinguishable and never cached', async () => {
  for (const [code, status] of [['BUSY', 503], ['HOST_UNREACHABLE', 502], ['ICON_NOT_FOUND', 404]]) {
    const result = await request('https://saved.example/', ['https://saved.example/'], Object.assign(new Error(), { code }));
    assert.equal(result.response.statusCode, status);
    assert.equal(result.response.body.code, code);
    assert.equal(result.headers['Cache-Control'], 'no-store');
  }
});
