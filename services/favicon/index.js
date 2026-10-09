const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const net = require('net');
const { readConfig } = require('./config');
const { createNetwork, normalizeUrl, error } = require('./network');
const { collectDocument, resolveCandidate, dataBuffer, validateImage, score } = require('./icons');
const { createBrowserFetcher } = require('./browser');
const { createLimiter } = require('./limiter');

function createFaviconService(overrides = {}, dependencies = {}) {
  const config = { ...readConfig(), ...overrides };
  const network = dependencies.network || createNetwork(config);
  const browserFetch = dependencies.browserFetch || createBrowserFetcher(config, network);
  const pending = new Map(), failures = new Map();
  const limit = createLimiter(config.maxConcurrent, config.maxQueue);
  const keyOf = (url) => crypto.createHash('sha256').update(url).digest('hex');
  const report = (key, stage, code) => config.logger({ key, stage, code });
  const rememberFailure = (key, code) => {
    if (failures.size >= 512) failures.delete(failures.keys().next().value);
    failures.set(key, { code, until: Date.now() + config.negativeTtlMs });
  };

  async function readCache(key) {
    try {
      const filename = path.join(config.cacheDir, `${key}.png`);
      const stat = await fs.stat(filename);
      if (Date.now() - stat.mtimeMs > config.cacheTtlMs || stat.size > config.maxBytes) return null;
      return await validateImage(await fs.readFile(filename), config);
    } catch { return null; }
  }

  async function saveCache(key, buffer) {
    let temporary;
    try {
      await fs.mkdir(config.cacheDir, { recursive: true });
      temporary = path.join(config.cacheDir, `${key}.${crypto.randomBytes(6).toString('hex')}.tmp`);
      await fs.writeFile(temporary, buffer, { flag: 'wx', mode: 0o600 });
      await fs.rename(temporary, path.join(config.cacheDir, `${key}.png`));
    } catch { report(key, 'cache', 'WRITE_FAILED'); }
    finally {
      if (temporary) await fs.unlink(temporary).catch(() => {});
    }
  }

  async function fetchIcon(url, key, signal) {
    const budget = { requests: 0 };
    const deadline = Date.now() + config.staticTimeoutMs;
    let reachable = false, htmlReachable = false, documentUrl = url, document;
    const attempted = new Set();
    const request = async (address, stage) => {
      try {
        const response = await network.get(address, { signal, deadline, budget, referer: documentUrl });
        reachable = true;
        return response;
      } catch (e) { report(key, stage, e.code || 'REQUEST_FAILED'); return null; }
    };
    const candidates = async (urls, stage) => {
      for (const address of [...new Set(urls)].slice(0, config.maxCandidates)) {
        if (signal.aborted || Date.now() >= deadline) return null;
        if (attempted.has(address)) continue;
        attempted.add(address);
        try {
          let buffer;
          if (address.startsWith('data:')) buffer = dataBuffer(address, config.maxBytes);
          else {
            const response = await request(address, stage);
            if (response?.status === 200) buffer = response.buffer;
          }
          if (buffer) return await validateImage(buffer, config);
        } catch (e) { report(key, stage, e.code || 'INVALID_IMAGE'); }
      }
      return null;
    };

    let page = await request(url, 'page');
    // Try HTTPS when an HTTP endpoint is unreachable; never downgrade HTTPS.
    if (!page && url.startsWith('http:') && !signal.aborted) {
      const upgraded = new URL(url);
      if (!upgraded.port || upgraded.port === '80') {
        upgraded.protocol = 'https:';
        page = await request(upgraded.href, 'https-page');
      }
    }
    if (page) {
      documentUrl = page.url;
      htmlReachable = page.status >= 200 && page.status < 400 &&
        (/html/i.test(page.contentType) || /^\s*<!doctype html|^\s*<html/i.test(page.buffer.toString('utf8', 0, 200)));
      if (htmlReachable) document = collectDocument(page.buffer.toString('utf8'), documentUrl);
      else if (page.status === 200) {
        try { return await validateImage(page.buffer, config); } catch {}
      }
    }
    let image = await candidates([
      ...(document?.primary || []),
      new URL('/favicon.ico', documentUrl).href,
      new URL('/favicon.png', documentUrl).href,
    ], 'icon');
    if (image) return image;

    if (htmlReachable && config.browserEnabled && !signal.aborted) {
      try {
        image = await browserFetch(documentUrl, signal);
        if (image) return image;
      } catch (e) {
        report(key, 'browser', e.code || (e.message?.includes('sandbox') ? 'SANDBOX_UNAVAILABLE' : 'BROWSER_FAILED'));
      }
    }
    const fallbackDeadline = Date.now() + 5000;
    const secondary = [...(document?.secondary || [])];
    for (const manifestUrl of (document?.manifests || []).slice(0, 2)) {
      if (signal.aborted || Date.now() >= fallbackDeadline) break;
      try {
        const response = await network.get(manifestUrl, { signal, deadline: fallbackDeadline, budget });
        if (response.status !== 200) continue;
        const manifest = JSON.parse(response.buffer.toString('utf8'));
        const icons = Array.isArray(manifest.icons) ? manifest.icons.filter((i) => i && typeof i.src === 'string') : [];
        icons.sort((a, b) => score(a.sizes, a.type) - score(b.sizes, b.type));
        secondary.push(...icons.map((i) => resolveCandidate(i.src, response.url)).filter(Boolean));
      } catch (e) { report(key, 'manifest', e.code || 'INVALID_MANIFEST'); }
    }
    for (const address of [...new Set([...secondary, ...(document?.logos || [])])].slice(0, config.maxCandidates)) {
      if (signal.aborted || Date.now() >= fallbackDeadline) break;
      try {
        const response = address.startsWith('data:')
          ? { status: 200, buffer: dataBuffer(address, config.maxBytes) }
          : await network.get(address, { signal, deadline: fallbackDeadline, budget, referer: documentUrl });
        if (response.status === 200) return await validateImage(response.buffer, config);
      } catch (e) { report(key, 'fallback', e.code || 'INVALID_IMAGE'); }
    }
    // Keep the existing New API / One API custom-logo compatibility, but only
    // after standard favicon sources, and validate it like every other image.
    if (htmlReachable && !signal.aborted && Date.now() < fallbackDeadline) {
      try {
        const status = await network.get(new URL('/api/status', documentUrl).href, {
          signal, deadline: fallbackDeadline, budget,
        });
        if (status.status === 200) {
          const logo = JSON.parse(status.buffer.toString('utf8'))?.data?.logo;
          const address = typeof logo === 'string' ? resolveCandidate(logo, documentUrl) : null;
          if (address?.startsWith('data:')) return await validateImage(dataBuffer(address, config.maxBytes), config);
          if (address) {
            const response = await network.get(address, { signal, deadline: fallbackDeadline, budget });
            if (response.status === 200) return await validateImage(response.buffer, config);
          }
        }
      } catch (e) { report(key, 'custom-logo', e.code || 'INVALID_LOGO'); }
    }
    throw error(signal.aborted ? 'DEADLINE' : reachable ? 'ICON_NOT_FOUND' : 'HOST_UNREACHABLE');
  }

  async function get(value) {
    const url = normalizeUrl(value), key = keyOf(url);
    if (pending.has(key)) return pending.get(key);
    if (pending.size >= config.maxConcurrent + config.maxQueue) throw error('BUSY');
    const work = (async () => {
      // Validate direct IP targets even if they already have a disk cache entry.
      const hostname = new URL(url).hostname.replace(/^\[|\]$/g, '');
      if (net.isIP(hostname)) await network.checkUrl(url);
      const cached = await readCache(key);
      if (cached) return { buffer: cached, cached: true };
      const failed = failures.get(key);
      if (failed && failed.until > Date.now()) throw error(failed.code);
      failures.delete(key);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.totalTimeoutMs);
      try {
        const buffer = await limit(() => fetchIcon(url, key, controller.signal), controller.signal);
        await saveCache(key, buffer);
        failures.delete(key);
        return { buffer, cached: false };
      } catch (e) {
        rememberFailure(key, e.code || 'FETCH_FAILED');
        throw e;
      } finally { clearTimeout(timer); }
    })();
    pending.set(key, work);
    try { return await work; } finally { pending.delete(key); }
  }
  return { get };
}

module.exports = { createFaviconService };
