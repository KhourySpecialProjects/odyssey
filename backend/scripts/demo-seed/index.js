// Fills an empty demo database with the fake demo world. Run: npm run demo:seed
// Refuses to run outside demo mode, against a database not named for the demo,
// or on a database that already has data.
'use strict';

const strapi = require('./strapi');
const { seedWorld } = require('./world');

function assertDemoDatabase() {
  if (process.env.DEMO_MODE !== 'true') {
    throw new Error('DEMO_MODE is not "true". The demo seed only runs against the demo database.');
  }
  const client = process.env.DATABASE_CLIENT;
  const name = client === 'sqlite' ? process.env.DATABASE_FILENAME : process.env.DATABASE_NAME;
  if (!name || !/demo/i.test(name)) {
    throw new Error(`Database "${name}" isn't a demo database (its name must contain "demo").`);
  }
}

async function main() {
  assertDemoDatabase();
  await strapi.boot();
  try {
    if ((await strapi.count('api::authorized-user.authorized-user')) > 0) {
      throw new Error(
        'The demo database already has data. Run npm run demo:db:reset for an empty one, then seed again.'
      );
    }
    const summary = await seedWorld(strapi);
    const token = await strapi.createFrontendToken();

    console.log('\nDemo world seeded:');
    for (const [label, value] of Object.entries(summary)) console.log(`  ${label}: ${value}`);
    console.log('\nPaste this into frontend/.env.demo as STRAPI_ACCESS_TOKEN:');
    console.log(`  ${token}\n`);
  } finally {
    await strapi.shutdown();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\nDemo seed failed: ${error.message}`);
    process.exit(1);
  });
