// Score with AI (ODY-814): the Next.js server starts a run, reports progress
// after each lesson, then saves every suggestion in one request.
export default {
  routes: [
    {
      method: 'POST',
      path: '/ai-scoring-runs/start',
      handler: 'custom-ai-scoring-run.start',
    },
    {
      method: 'POST',
      path: '/ai-scoring-runs/heartbeat',
      handler: 'custom-ai-scoring-run.heartbeat',
    },
    {
      method: 'POST',
      path: '/ai-scoring-runs/finish',
      handler: 'custom-ai-scoring-run.finish',
    },
  ],
};
