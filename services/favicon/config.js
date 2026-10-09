const path = require('path');

const number = (value, fallback, min, max) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? Math.floor(parsed)
    : fallback;
};

const readConfig = (env = process.env) => ({
  cacheDir: path.join(__dirname, '../../data/uploads/favicons/v2'),
  cacheTtlMs: number(env.FAVICON_CACHE_TTL_HOURS, 24, 1, 168) * 3600000,
  negativeTtlMs: 15000,
  requestTimeoutMs: 4000,
  staticTimeoutMs: 12000,
  totalTimeoutMs: 30000,
  maxBytes: 2 * 1024 * 1024,
  maxPixels: 4096 * 4096,
  maxCandidates: 12,
  maxRequests: 24,
  maxConcurrent: 4,
  maxQueue: 16,
  browserEnabled: env.FAVICON_BROWSER_ENABLED !== 'false',
  browserExecutable: env.FAVICON_CHROMIUM_PATH || '/usr/bin/chromium-browser',
  browserTimeoutMs: number(env.FAVICON_BROWSER_TIMEOUT_MS, 12000, 3000, 20000),
  browserWaitMs: number(env.FAVICON_BROWSER_WAIT_MS, 2500, 200, 5000),
  // Never silently disable Chromium's sandbox.
  browserNoSandbox: env.FAVICON_BROWSER_NO_SANDBOX === 'true',
  browserConcurrent: 1,
  allowPrivate: env.FAVICON_ALLOW_PRIVATE !== 'false',
  allowSelfSigned: env.FAVICON_ALLOW_SELF_SIGNED !== 'false',
  // Test-only dependency injection, never exposed through environment or HTTP.
  allowLoopback: false,
  logger: (event) => console.warn('[favicon]', JSON.stringify(event)),
});

module.exports = { readConfig };
