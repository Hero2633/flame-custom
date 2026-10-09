const cheerio = require('cheerio');
const sharp = require('sharp');
const { normalizeUrl, error } = require('./network');

function resolveCandidate(value, base) {
  try {
    if (value?.trim().startsWith('data:image/')) return value.trim();
    return normalizeUrl(new URL(value, base).href);
  } catch { return null; }
}

function score(sizes = '', type = '') {
  sizes = typeof sizes === 'string' ? sizes : '';
  type = typeof type === 'string' ? type : '';
  if (sizes.toLowerCase() === 'any' || type.includes('svg')) return 0;
  const values = sizes.split(/\s+/).map((s) => /^(\d+)x\1$/i.exec(s))
    .filter(Boolean).map((m) => Number(m[1]));
  if (!values.length) return 100;
  return Math.min(...values.map((size) => size >= 32 ? size - 32 : 1000 + 32 - size));
}

function collectDocument(html, documentUrl) {
  const $ = cheerio.load(html);
  let base = documentUrl;
  const baseHref = $('base[href]').first().attr('href');
  if (baseHref) base = resolveCandidate(baseHref, documentUrl) || documentUrl;
  const primary = [], secondary = [], manifests = [];
  $('link[href]').each((order, element) => {
    const link = $(element);
    const rel = (link.attr('rel') || '').toLowerCase().split(/\s+/);
    const url = resolveCandidate(link.attr('href'), base);
    if (!url) return;
    const candidate = { url, score: score(link.attr('sizes'), link.attr('type')), order };
    if (rel.includes('icon')) primary.push(candidate);
    else if (rel.some((r) => ['apple-touch-icon', 'apple-touch-icon-precomposed'].includes(r))) secondary.push(candidate);
    else if (rel.includes('manifest')) manifests.push(url);
  });
  const sort = (items) => items.sort((a, b) => a.score - b.score || b.order - a.order).map((c) => c.url);
  // Explicit brand images are only a final fallback, never preferred over favicon.
  const logos = [];
  $('img[src]').each((_, el) => {
    const img = $(el);
    if (/logo|brand/i.test(`${img.attr('id') || ''} ${img.attr('class') || ''} ${img.attr('alt') || ''}`)) {
      const url = resolveCandidate(img.attr('src'), base);
      if (url) logos.push(url);
    }
  });
  return { primary: sort(primary), secondary: sort(secondary), manifests, logos };
}

function dataBuffer(url, maxBytes) {
  if (url.length > maxBytes * 4) throw error('IMAGE_TOO_LARGE');
  const match = /^data:(image\/[^,;]+)(;[^,]*)?,([\s\S]*)$/i.exec(url);
  if (!match) throw error('INVALID_IMAGE');
  const buffer = /;base64(?:;|$)/i.test(match[2] || '')
    ? Buffer.from(match[3], 'base64')
    : Buffer.from(decodeURIComponent(match[3]));
  if (!buffer.length || buffer.length > maxBytes) throw error('IMAGE_TOO_LARGE');
  return buffer;
}

async function validateImage(input, config) {
  if (!Buffer.isBuffer(input) || !input.length || input.length > config.maxBytes) throw error('INVALID_IMAGE');
  let buffer = input;
  // ICO isn't decoded by libvips. Validate frame bounds before the ICO decoder.
  if (buffer.length >= 6 && buffer.readUInt32LE(0) === 0x00010000) {
    const count = buffer.readUInt16LE(4);
    if (!count || count > 32 || buffer.length < 6 + count * 16) throw error('INVALID_ICO');
    for (let i = 0; i < count; i++) {
      const p = 6 + i * 16, size = buffer.readUInt32LE(p + 8), offset = buffer.readUInt32LE(p + 12);
      if (!size || offset < 6 + count * 16 || offset + size > buffer.length) throw error('INVALID_ICO');
      const frame = buffer.subarray(offset, offset + size);
      if (frame.length >= 24 && frame.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
        if (frame.readUInt32BE(16) > 256 || frame.readUInt32BE(20) > 256) throw error('INVALID_ICO');
      } else if (frame.length < 40 || frame.readUInt32LE(0) !== 40 ||
          Math.abs(frame.readInt32LE(4)) > 256 || Math.abs(frame.readInt32LE(8)) > 512) {
        throw error('INVALID_ICO');
      }
    }
    const { parseICO } = await import('icojs');
    const images = await parseICO(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    images.sort((a, b) => Math.abs(a.width - 32) - Math.abs(b.width - 32));
    if (!images.length) throw error('INVALID_ICO');
    buffer = Buffer.from(images[0].buffer);
  }
  // Never serve third-party SVG/HTML on the application's origin. Disallow
  // external SVG references before rasterizing; preserve alpha in the PNG.
  const prefix = buffer.subarray(0, 1024).toString('utf8').trim();
  if (prefix.startsWith('<')) {
    const text = buffer.toString('utf8');
    if (/<!ENTITY|<!DOCTYPE|<script|<foreignObject|@import|url\s*\(\s*['"]?(?!#)|(?:href|src)\s*=\s*['"](?!#|data:image\/)/i.test(text)) {
      throw error('UNSAFE_SVG');
    }
  }
  try {
    const image = sharp(buffer, { limitInputPixels: config.maxPixels, failOn: 'warning', animated: false });
    const meta = await image.metadata();
    if (!['png', 'jpeg', 'webp', 'gif', 'svg', 'avif', 'heif'].includes(meta.format) || !meta.width || !meta.height) {
      throw error('INVALID_IMAGE');
    }
    // toBuffer performs full decoding; metadata alone is insufficient.
    return await image.resize(128, 128, { fit: 'inside', withoutEnlargement: true })
      .png().timeout({ seconds: 3 }).toBuffer();
  } catch (e) {
    throw error(e.code === 'UNSAFE_SVG' ? e.code : 'INVALID_IMAGE');
  }
}

module.exports = { collectDocument, resolveCandidate, score, dataBuffer, validateImage };
