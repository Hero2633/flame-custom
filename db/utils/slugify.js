const packageVersion = require('../../package.json').version;

const slugify = () => {
  const configuredVersion = process.env.VERSION;
  const version =
    typeof configuredVersion === 'string' &&
    /^\d+(?:\.\d+)*$/.test(configuredVersion)
      ? configuredVersion
      : packageVersion;
  const slug = `db-${version.replace(/\./g, '')}-backup.sqlite`;
  return slug;
};

const parseSlug = (slug) => {
  const parts = slug.split('-');
  const version = {
    raw: parts[1],
    parsed: parts[1].split('').join('.'),
  };
  return version;
};

module.exports = {
  slugify,
  parseSlug,
};
