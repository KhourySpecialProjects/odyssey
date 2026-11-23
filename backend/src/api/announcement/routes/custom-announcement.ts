// Reminders (ODY-931): the Next.js server decides, this route records.
export default {
  routes: [
    {
      method: 'POST',
      path: '/announcements/raise-reminder',
      handler: 'custom-announcement.raiseReminder',
    },
  ],
};
