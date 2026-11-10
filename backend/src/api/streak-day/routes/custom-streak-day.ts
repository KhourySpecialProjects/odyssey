// Streak days (ODY-918): the Next.js server records a day when a learner
// finishes a new lesson. It works out the learner's local date first.
export default {
  routes: [
    {
      method: 'POST',
      path: '/streak-days/record',
      handler: 'custom-streak-day.record',
    },
  ],
};
