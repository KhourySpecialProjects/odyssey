// Chat reads and writes (ODY-937): the Next.js server calls these with the service token.
export default {
  routes: [
    { method: 'POST', path: '/mentor-chats/start', handler: 'custom-mentor-chat.start' },
    { method: 'GET', path: '/mentor-chats/owned', handler: 'custom-mentor-chat.list' },
    { method: 'DELETE', path: '/mentor-chats/owned', handler: 'custom-mentor-chat.removeAll' },
    { method: 'GET', path: '/mentor-chats/owned/:documentId', handler: 'custom-mentor-chat.findOwned' },
    { method: 'POST', path: '/mentor-chats/owned/:documentId/exchange', handler: 'custom-mentor-chat.exchange' },
    { method: 'DELETE', path: '/mentor-chats/owned/:documentId', handler: 'custom-mentor-chat.remove' },
  ],
};
