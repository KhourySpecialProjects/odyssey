// Co-completion pair counts (ODY-962). Service token only; no `auth: false`.
export default {
  routes: [
    {
      method: 'GET',
      path: '/co-completions',
      handler: 'custom-enrollment.coCompletion',
    },
  ],
};
