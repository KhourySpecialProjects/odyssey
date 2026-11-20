// Chat reads and writes (ODY-937): the Next.js server calls these with the service token.
const config = { policies: ['global::service-token-only'] };

export default {
  routes: [
    { method: 'POST', path: '/mentor-chats/start', handler: 'custom-mentor-chat.start', config },
    { method: 'GET', path: '/mentor-chats/owned', handler: 'custom-mentor-chat.list', config },
    { method: 'DELETE', path: '/mentor-chats/owned', handler: 'custom-mentor-chat.removeAll', config },
    { method: 'GET', path: '/mentor-chats/owned/:documentId', handler: 'custom-mentor-chat.findOwned', config },
    { method: 'POST', path: '/mentor-chats/owned/:documentId/exchange', handler: 'custom-mentor-chat.exchange', config },
    { method: 'DELETE', path: '/mentor-chats/owned/:documentId', handler: 'custom-mentor-chat.remove', config },
  ],
};
