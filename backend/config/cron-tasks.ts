import { purgeExpiredChats } from '../src/lib/mentor-chats';

export default {
  // Saved Mentor chats are kept 30 days (ODY-937); runs daily at 03:30 Boston time
  purgeMentorChats: {
    task: async ({ strapi }) => {
      try {
        const { chats } = await purgeExpiredChats();
        strapi.log.info(`Mentor chat cleanup removed ${chats} chats.`);
      } catch (error) {
        const { name, message } = error as Error;
        strapi.log.error(`Mentor chat cleanup failed: ${name}: ${message}`);
      }
    },
    options: { rule: '30 3 * * *', tz: 'America/New_York' },
  },
};
