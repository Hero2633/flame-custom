const asyncWrapper = require('../../middleware/asyncWrapper');
const { createFaviconService } = require('../../services/favicon');
const { normalizeUrl } = require('../../services/favicon/network');
const App = require('../../models/App');
const Bookmark = require('../../models/Bookmark');

const service = createFaviconService();

// Successful responses are fully decoded PNG images, never remote SVG or HTML.
module.exports = asyncWrapper(async (req, res) => {
  try {
    const target = normalizeUrl(req.query.url);
    // The image endpoint is public (plain <img> cannot send the auth header).
    // Only saved sites may trigger browsing, never arbitrary caller-supplied URLs.
    const lists = await Promise.all([App, Bookmark].map((model) =>
      model.findAll({ attributes: ['url'], raw: true })));
    const registered = lists.flat().some(({ url }) => {
      try {
        return normalizeUrl(/^\w+:\/\//.test(url) ? url : `http://${url}`) === target;
      } catch { return false; }
    });
    if (!registered) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(403).json({ success: false, code: 'UNREGISTERED_SITE', message: 'Favicon unavailable' });
    }
    const { buffer } = await service.get(target);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(buffer);
  } catch (err) {
    const code = err.code || 'FETCH_FAILED';
    const status = code === 'INVALID_URL' ? 400
      : code === 'ADDRESS_BLOCKED' ? 403
      : code === 'ICON_NOT_FOUND' ? 404
      : code === 'BUSY' ? 503 : 502;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '20');
    return res.status(status).json({ success: false, code, message: 'Favicon unavailable' });
  }
});
