import { purgeExpiredChats } from '../src/lib/mentor-chats';

export default {
  // Saved Mentor chats are kept 30 days (ODY-937); runs daily at 03:30 server time
  purgeMentorChats: {
    task: async ({ strapi }) => {
      try {
        const { chats } = await purgeExpiredChats();
        strapi.log.info(`Mentor chat cleanup removed ${chats} chats.`);
      } catch (error) {
        strapi.log.error('Mentor chat cleanup failed.', error);
      }
    },
    options: { rule: '30 3 * * *' },
  },
};
