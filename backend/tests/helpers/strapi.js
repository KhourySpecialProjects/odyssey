const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..', '..');
const dbRelativePath = path.join(
  '.tmp',
  `test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`
);

let instance = null;

// Set before boot, in code (never in a .env file). Dummy secrets only.
function setTestEnv() {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: '0',
    DATABASE_CLIENT: 'sqlite',
    // config/database.ts resolves this relative to the backend directory.
    DATABASE_FILENAME: dbRelativePath,
    APP_KEYS: 'testKeyA,testKeyB,testKeyC,testKeyD',
    API_TOKEN_SALT: 'test-api-token-salt',
    ADMIN_JWT_SECRET: 'test-admin-jwt-secret',
    JWT_SECRET: 'test-jwt-secret',
    TRANSFER_TOKEN_SALT: 'test-transfer-token-salt',
    ENCRYPTION_KEY: 'test-encryption-key',
    SLACK_WEBHOOK_URL: 'https://hooks.slack.test/odyssey',
    STRAPI_TELEMETRY_DISABLED: 'true',
    STRAPI_HIDE_STARTUP_MESSAGE: 'true',
  });
}

async function setupStrapi() {
  if (instance) return instance;

  setTestEnv();
  fs.mkdirSync(path.join(backendDir, '.tmp'), { recursive: true });

  // Required lazily so the env above is set before Strapi reads anything.
  const { compileStrapi, createStrapi } = require('@strapi/strapi');

  const appContext = await compileStrapi({ appDir: backendDir });
  instance = await createStrapi(appContext).load();
  instance.server.mount();
  return instance;
}

async function teardownStrapi() {
  if (!instance) return;
  const strapi = instance;
  instance = null;

  // strapi.destroy() also closes the DB connection. Destroying the knex pool
  // separately first raised an unhandled "aborted" rejection from tarn.
  await strapi.destroy();

  // Remove only this run's own test database.
  const dbPath = path.join(backendDir, dbRelativePath);
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    fs.rmSync(dbPath + suffix, { force: true });
  }
}

module.exports = { setupStrapi, teardownStrapi };
