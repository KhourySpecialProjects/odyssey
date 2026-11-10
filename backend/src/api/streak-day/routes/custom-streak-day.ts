// Streak days (ODY-918): the Next.js server records a day when a learner
// finishes a new lesson, and revives a missed one (ODY-920). It works out
// the learner's local date first.
export default {
  routes: [
    {
      method: 'POST',
      path: '/streak-days/record',
      handler: 'custom-streak-day.record',
    },
    {
      method: 'POST',
      path: '/streak-days/revive',
      handler: 'custom-streak-day.revive',
    },
    // The streak testing panel (ODY-921, temporary): 404 unless testing is on
    {
      method: 'POST',
      path: '/streak-days/test/set',
      handler: 'custom-streak-day.setTest',
    },
    {
      method: 'POST',
      path: '/streak-days/test/clear',
      handler: 'custom-streak-day.clearTest',
    },
  ],
};
