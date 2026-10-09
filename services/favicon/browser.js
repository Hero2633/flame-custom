const { setTimeout: delay } = require('timers/promises');
const { createLimiter } = require('./limiter');
const { collectDocument, dataBuffer, validateImage } = require('./icons');
const { error } = require('./network');

function createBrowserFetcher(config, network) {
  const limit = createLimiter(config.browserConcurrent, config.maxQueue);
  return (url, signal) => limit(async () => {
    if (!config.browserEnabled) return null;
    const puppeteer = require('puppeteer-core');
    let browser, context, timer;
    let stopped = false;
    const stop = () => {
      stopped = true;
      // Only terminate the process created for this attempt.
      if (browser) browser.process()?.kill('SIGKILL');
    };
    signal.addEventListener('abort', stop, { once: true });
    try {
      if (signal.aborted) throw error('DEADLINE');
      browser = await puppeteer.launch({
        executablePath: config.browserExecutable,
        headless: true,
        pipe: true,
        // Do not leak Flame's password, JWT secret or integration tokens into
        // the browser process environment.
        env: Object.fromEntries(
          ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'XDG_RUNTIME_DIR']
            .filter((key) => process.env[key]).map((key) => [key, process.env[key]])
        ),
        acceptInsecureCerts: config.allowSelfSigned,
        timeout: 6000,
        protocolTimeout: config.browserTimeoutMs,
        args: [
          '--disable-dev-shm-usage', '--disable-background-networking',
          '--disable-extensions', '--disable-quic',
          '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
          '--js-flags=--max-old-space-size=128',
          ...(config.browserNoSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
        ],
      });
      if (stopped || signal.aborted) { stop(); throw error('DEADLINE'); }
      timer = setTimeout(stop, config.browserTimeoutMs);
      context = await browser.createBrowserContext({ downloadBehavior: { policy: 'deny' } });
      const page = await context.newPage();
      await page.setBypassServiceWorker(true);
      await page.setCacheEnabled(false);
      await page.setRequestInterception(true);
      let requests = 0, bytes = 0;
      const session = await page.createCDPSession();
      await session.send('Network.enable');
      session.on('Network.dataReceived', ({ dataLength }) => {
        bytes += dataLength;
        if (bytes > 16 * 1024 * 1024) stop();
      });
      page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));
      page.on('popup', (popup) => popup.close().catch(() => {}));
      page.on('request', async (request) => {
        try {
          if (stopped || signal.aborted || ++requests > 100 ||
              !['GET', 'HEAD'].includes(request.method()) ||
              ['media', 'font', 'websocket', 'eventsource'].includes(request.resourceType()) ||
              (request.isNavigationRequest() && request.frame() !== page.mainFrame())) {
            return await request.abort();
          }
          const address = request.url();
          if (!address.startsWith('data:') && !address.startsWith('blob:')) await network.checkUrl(address);
          if (!request.isInterceptResolutionHandled()) await request.continue();
        } catch {
          if (!request.isInterceptResolutionHandled()) await request.abort().catch(() => {});
        }
      });
      await network.checkUrl(url);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.browserTimeoutMs });
      // Dashboards often poll forever; never wait indefinitely for networkidle.
      await delay(config.browserWaitMs, undefined, { signal });
      const snapshot = await page.evaluate(() => ({
        url: location.href,
        html: [
          ...Array.from(document.querySelectorAll('base[href],link[href]')).slice(0, 100),
          ...Array.from(document.querySelectorAll('img[src]')).filter((img) =>
            /logo|brand/i.test(`${img.id} ${img.className} ${img.alt}`)).slice(0, 10),
        ].map((element) => {
          const clone = element.cloneNode(false);
          if ('href' in element) clone.setAttribute('href', element.href);
          if ('src' in element) clone.setAttribute('src', element.src);
          return clone.outerHTML.slice(0, 65536);
        }).join(''),
        blobs: Array.from(document.querySelectorAll('link[rel~="icon"]'))
          .map((link) => link.href).filter((href) => href.startsWith('blob:')).slice(0, 4),
      }));
      const document = collectDocument(snapshot.html, snapshot.url);
      const candidates = [...new Set([
        ...snapshot.blobs, ...document.primary,
        new URL('/favicon.ico', snapshot.url).href,
        new URL('/favicon.png', snapshot.url).href,
        ...document.secondary, ...document.logos,
      ])].slice(0, config.maxCandidates);
      for (const candidate of candidates) {
        if (stopped || signal.aborted) throw error('DEADLINE');
        try {
          let buffer;
          if (candidate.startsWith('data:')) buffer = dataBuffer(candidate, config.maxBytes);
          else {
            // Fetch with this disposable context's cookies, never a user's session.
            const encoded = await page.evaluate(async (address, maxBytes) => {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 2500);
              try {
                const response = await fetch(address, { credentials: 'same-origin', signal: controller.signal });
                if (!response.ok || !response.body) return null;
                const reader = response.body.getReader(), chunks = [];
                let size = 0;
                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  size += value.length;
                  if (size > maxBytes) { await reader.cancel(); return null; }
                  chunks.push(value);
                }
                let binary = '';
                for (const chunk of chunks) {
                  for (let i = 0; i < chunk.length; i += 8192) {
                    binary += String.fromCharCode(...chunk.subarray(i, i + 8192));
                  }
                }
                return btoa(binary);
              } finally { clearTimeout(timeout); }
            }, candidate, config.maxBytes).catch(() => null);
            if (encoded) buffer = Buffer.from(encoded, 'base64');
            else if (!candidate.startsWith('blob:')) {
              const response = await network.get(candidate, { signal, referer: snapshot.url });
              if (response.status === 200) buffer = response.buffer;
            }
          }
          if (buffer) return await validateImage(buffer, config);
        } catch {
          if (signal.aborted || stopped) throw error('DEADLINE');
        }
      }
      return null;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', stop);
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }
  }, signal);
}

module.exports = { createBrowserFetcher };
