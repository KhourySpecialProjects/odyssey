// Rating writes (ODY-890): the Next.js server posts here with the service token.
export default {
  routes: [
    {
      method: 'POST',
      path: '/mentor-feedbacks/record',
      handler: 'custom-mentor-feedback.record',
    },
  ],
};
