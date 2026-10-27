// POST, not PUT: `PUT /review-scores/upsert` would clash with the core
// `PUT /review-scores/:id` route.
export default {
  routes: [
    {
      method: 'POST',
      path: '/review-scores/upsert',
      handler: 'custom-review-score.upsert',
    },
    {
      method: 'POST',
      path: '/review-scores/accept-ai',
      handler: 'custom-review-score.acceptAi',
    },
  ],
};
