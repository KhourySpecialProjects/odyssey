// Quiz attempt writes (ODY-939): the Next.js server posts here with the service token. No core router.
export default {
  routes: [
    {
      method: 'POST',
      path: '/quiz-attempts/record',
      handler: 'custom-quiz-attempt.record',
    },
  ],
};
