const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { slugify } = require('../../db/utils/slugify');

const originalVersion = process.env.VERSION;

afterEach(() => {
  if (originalVersion === undefined) delete process.env.VERSION;
  else process.env.VERSION = originalVersion;
});

test('uses VERSION when it is a valid dotted numeric version', () => {
  process.env.VERSION = '2.4.2';
  assert.equal(slugify(), 'db-242-backup.sqlite');
});

test('falls back to package version when VERSION is absent', () => {
  delete process.env.VERSION;
  assert.equal(slugify(), 'db-010-backup.sqlite');
});

test('falls back safely for malformed VERSION values', () => {
  for (const value of ['', '2/../../etc', 'latest', '2.4.2\n']) {
    process.env.VERSION = value;
    assert.equal(slugify(), 'db-010-backup.sqlite');
  }
});
