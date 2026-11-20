// Badge store (ODY-987). Only the Next.js server calls these, with the service
// token. Each route pins the content-api-token strategy, so a Public or
// Authenticated role grant (or a user JWT) can never open them. There is no core
// router file, so the core REST endpoints don't exist.
const auth = { strategies: ['content-api-token'] };

export default {
  routes: [
    {
      method: 'POST',
      path: '/droplet-badges/options',
      handler: 'custom-droplet-badge.saveOptions',
      config: { auth },
    },
    {
      method: 'POST',
      path: '/droplet-badges/pick',
      handler: 'custom-droplet-badge.pick',
      config: { auth },
    },
    {
      method: 'GET',
      path: '/droplet-badges/picked',
      handler: 'custom-droplet-badge.picked',
      config: { auth },
    },
    {
      method: 'GET',
      path: '/droplet-badges/options',
      handler: 'custom-droplet-badge.options',
      config: { auth },
    },
  ],
};
