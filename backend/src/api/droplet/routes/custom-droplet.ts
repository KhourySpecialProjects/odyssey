export default {
  routes: [
    {
      method: 'POST',
      path: '/droplets/:id/publish-edit',
      handler: 'custom-droplet.publishEdit',
    },
    {
      method: 'POST',
      path: '/droplets/:id/submit-review',
      handler: 'custom-droplet.submitReview',
    },
    {
      method: 'POST',
      path: '/droplets/:id/withdraw-review',
      handler: 'custom-droplet.withdrawReview',
    },
    {
      method: 'POST',
      path: '/droplets/:id/send-feedback',
      handler: 'custom-droplet.sendFeedback',
    },
    {
      method: 'POST',
      path: '/droplets/:id/publish-review',
      handler: 'custom-droplet.publishReview',
    },
  ],
};
