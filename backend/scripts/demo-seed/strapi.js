// Every Strapi call the demo seed makes goes through this file, so moving the
// seed to Strapi v5 (Document Service, documentId) means changing only here.
'use strict';

const path = require('path');

let app = null;

/** Compiles the TypeScript backend and loads Strapi without starting the server. */
async function boot() {
  const strapiFactory = require('@strapi/strapi');
  const tsUtils = require('@strapi/typescript-utils');
  const appDir = path.join(__dirname, '..', '..');
  const distDir = await tsUtils.resolveOutDir(appDir);
  await tsUtils.compile(appDir, { watch: false, configOptions: { options: { incremental: true } } });
  app = await strapiFactory({ appDir, distDir }).load();
  app.log.level = 'warn';
  return app;
}

async function shutdown() {
  if (app) await app.destroy();
}

const draftAndPublish = (uid) => Boolean(app.contentTypes[uid]?.options?.draftAndPublish);

/**
 * Creates an entry. Content types with Strapi's draft & publish get a
 * publishedAt like REST creates do, since the app only reads published entries.
 */
async function create(uid, data) {
  const withPublish =
    draftAndPublish(uid) && !('publishedAt' in data) ? { ...data, publishedAt: new Date() } : data;
  return app.entityService.create(uid, { data: withPublish });
}

const update = (uid, id, data) => app.entityService.update(uid, id, { data });
const findMany = (uid, params = {}) => app.entityService.findMany(uid, params);
const count = (uid, params = {}) => app.entityService.count(uid, params);

/** Mints a full-access API token for the demo frontend's STRAPI_ACCESS_TOKEN. */
async function createFrontendToken() {
  const token = await app.service('admin::api-token').create({
    name: `demo-frontend-${Date.now()}`,
    description: 'Demo frontend (created by npm run demo:seed)',
    type: 'full-access',
    lifespan: null,
  });
  return token.accessKey;
}

module.exports = { boot, shutdown, create, update, findMany, count, createFrontendToken };
