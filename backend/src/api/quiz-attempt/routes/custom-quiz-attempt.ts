// Quiz attempt writes (ODY-939): the Next.js server posts here with the service token. No core router.
const config = { policies: ['global::service-token-only'] };

export default {
  routes: [
    {
      method: 'POST',
      path: '/quiz-attempts/record',
      handler: 'custom-quiz-attempt.record',
      config,
    },
  ],
};
