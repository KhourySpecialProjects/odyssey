// Co-completion pair counts (ODY-962). API tokens only, so role grants can't open it.
export default {
  routes: [
    {
      method: 'GET',
      path: '/co-completions',
      handler: 'custom-enrollment.coCompletion',
      config: { auth: { strategies: ['content-api-token'] } },
    },
  ],
};
