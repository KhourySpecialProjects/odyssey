/**
 * Creates a full-access API token and returns its access key, so REST tests
 * can send `Authorization: Bearer <key>`.
 */
async function createFullAccessToken(strapi, name = 'jest-full-access') {
  const token = await strapi.service('admin::api-token').create({
    name,
    description: 'Created by the Jest harness',
    type: 'full-access',
    lifespan: null,
  });
  return token.accessKey;
}

module.exports = { createFullAccessToken };
