// Quiz attempt writes and the recent read (ODY-939): the Next.js server calls these with the service token. No core router.
const config = { policies: ['global::service-token-only'] };

export default {
  routes: [
    {
      method: 'POST',
      path: '/quiz-attempts/record',
      handler: 'custom-quiz-attempt.record',
      config,
    },
    { method: 'GET', path: '/quiz-attempts/recent', handler: 'custom-quiz-attempt.recent', config },
  ],
};
