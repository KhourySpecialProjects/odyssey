// Saved Mentor replies (ODY-967): the Next.js server posts here with the service token.
const config = { policies: ['global::service-token-only'] };

export default {
  routes: [
    { method: 'POST', path: '/mentor-cached-replies/find', handler: 'custom-mentor-cached-reply.find', config },
    { method: 'POST', path: '/mentor-cached-replies/store', handler: 'custom-mentor-cached-reply.store', config },
  ],
};
