const path = require('path');

module.exports = async () => {
  const { compileStrapi } = require('@strapi/strapi');
  const { distDir } = await compileStrapi({ appDir: path.resolve(__dirname, '..') });
  process.env.STRAPI_TEST_DIST_DIR = distDir;
};

