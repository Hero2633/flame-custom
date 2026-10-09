const dns = require('dns');
const http = require('http');
const https = require('https');
const net = require('net');
const axios = require('axios');
const ipaddr = require('ipaddr.js');

const error = (code) => Object.assign(new Error(code), { code });

function normalizeUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096) {
    throw error('INVALID_URL');
  }
  let url;
  try { url = new URL(value.trim()); } catch { throw error('INVALID_URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw error('INVALID_URL');
  }
  url.hash = '';
  return url.href;
}

function addressAllowed(address, config) {
  try {
    const ip = ipaddr.process(address);
    const range = ip.range();
    if (range === 'loopback') return config.allowLoopback;
    if (['private', 'uniqueLocal'].includes(range)) return config.allowPrivate;
    return range === 'unicast';
  } catch { return false; }
}

function createNetwork(config) {
  const hostnameOf = (url) => new URL(url).hostname.replace(/^\[|\]$/g, '');
  const checkAddress = (address) => {
    if (!addressAllowed(address, config)) throw error('ADDRESS_BLOCKED');
  };
  const lookup = (hostname, options, callback) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err) return callback(err);
      try {
        if (!addresses.length) throw error('DNS_EMPTY');
        addresses.forEach(({ address }) => checkAddress(address));
        let selected = addresses;
        if (options.family) selected = addresses.filter((a) => a.family === options.family);
        if (!selected.length) throw error('DNS_EMPTY');
        if (options.all) callback(null, selected);
        else callback(null, selected[0].address, selected[0].family);
      } catch (failure) { callback(failure); }
    });
  };
  const httpAgent = new http.Agent({ lookup });
  const httpsAgent = new https.Agent({
    lookup,
    rejectUnauthorized: !config.allowSelfSigned,
  });

  async function checkUrl(value) {
    const url = normalizeUrl(value);
    const hostname = hostnameOf(url);
    if (net.isIP(hostname)) checkAddress(hostname);
    else await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(error('DNS_TIMEOUT')), config.requestTimeoutMs);
      lookup(hostname, {}, (e) => {
        clearTimeout(timer);
        if (e) reject(e);
        else resolve();
      });
    });
    return url;
  }

  async function get(value, { signal, referer, deadline = Infinity, budget } = {}) {
    let url = normalizeUrl(value);
    for (let redirect = 0; redirect <= 5; redirect++) {
      if (signal?.aborted || Date.now() >= deadline) throw error('DEADLINE');
      if (budget && ++budget.requests > config.maxRequests) throw error('REQUEST_LIMIT');
      // DNS names are resolved and checked by the Agent on every actual connection.
      const hostname = hostnameOf(url);
      if (net.isIP(hostname)) checkAddress(hostname);
      const remaining = Math.min(config.requestTimeoutMs, deadline - Date.now());
      const response = await axios.get(url, {
        httpAgent, httpsAgent, proxy: false, maxRedirects: 0,
        timeout: Math.max(1, remaining), signal,
        maxContentLength: config.maxBytes, maxBodyLength: config.maxBytes,
        responseType: 'arraybuffer',
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,image/avif,image/webp,image/*,*/*;q=0.8',
          ...(referer ? { Referer: referer } : {}),
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.location) {
        url = normalizeUrl(new URL(response.headers.location, url).href);
        continue;
      }
      return {
        url, status: response.status,
        contentType: response.headers['content-type'] || '',
        buffer: Buffer.from(response.data),
      };
    }
    throw error('REDIRECT_LIMIT');
  }
  return { get, checkUrl };
}

module.exports = { normalizeUrl, addressAllowed, createNetwork, error };
