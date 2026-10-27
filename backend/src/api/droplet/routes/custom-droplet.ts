export default {
  routes: [
    {
      method: 'POST',
      path: '/droplets/:id/publish-edit',
      handler: 'custom-droplet.publishEdit',
    },
  ],
};
