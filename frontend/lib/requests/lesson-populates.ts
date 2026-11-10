/** Strapi 5 needs per-component `on` fragments; unlisted components are dropped. */
export const LESSON_BLOCKS_POPULATE = {
  blocks: {
    on: {
      "droplets.generic": true,
      "droplets.video": true,
      "droplets.callout": true,
      "droplets.expandable": true,
      "droplets.quiz": {
        populate: { questions: { populate: ["answerOptions"] } },
      },
      "droplets.open-ended-quiz": { populate: ["questions"] },
    },
  },
};
