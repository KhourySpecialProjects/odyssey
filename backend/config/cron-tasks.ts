import { purgeExpiredChats } from '../src/lib/mentor-chats';
import { purgeExpiredQuizAttempts } from '../src/lib/quiz-attempt';

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
  // Lesson quiz attempts are kept 30 days (ODY-939); runs daily at 03:45 Boston time
  purgeQuizAttempts: {
    task: async ({ strapi }) => {
      try {
        const { attempts } = await purgeExpiredQuizAttempts();
        strapi.log.info(`Quiz attempt cleanup removed ${attempts} attempts.`);
      } catch (error) {
        const { name, message } = error as Error;
        strapi.log.error(`Quiz attempt cleanup failed: ${name}: ${message}`);
      }
    },
    options: { rule: '45 3 * * *', tz: 'America/New_York' },
  },
};
