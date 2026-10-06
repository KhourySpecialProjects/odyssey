const request = require('supertest');

let adminCounter = 0;

/**
 * Creates a super-admin user, logs in through POST /admin/login and returns
 * the Bearer token for the admin API (content-manager) routes.
 */
async function createSuperAdminToken(strapi) {
  const role = await strapi.service('admin::role').getSuperAdmin();
  const email = `admin-${process.pid}-${Date.now()}-${++adminCounter}@example.com`;
  const password = 'Test1234!pass';

  await strapi.service('admin::user').create({
    firstname: 'Jest',
    lastname: 'Admin',
    email,
    password,
    isActive: true,
    roles: [role.id],
    registrationToken: null,
  });

  const res = await request(strapi.server.httpServer)
    .post('/admin/login')
    .send({ email, password });

  if (res.status !== 200 || !res.body?.data?.token) {
    throw new Error(`Admin login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token;
}

module.exports = { createSuperAdminToken };
