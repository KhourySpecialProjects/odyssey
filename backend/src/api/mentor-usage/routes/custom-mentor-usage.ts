// Mentor's allowance check and usage record (ODY-884): the Next.js server
// checks before it calls the model and records once the call has started.
export default {
  routes: [
    {
      method: 'POST',
      path: '/mentor-usages/check',
      handler: 'custom-mentor-usage.check',
    },
    {
      method: 'POST',
      path: '/mentor-usages/record',
      handler: 'custom-mentor-usage.record',
    },
  ],
};
