export const ENROLLMENT_POPULATES = {
  /** Just droplet.id + viewedLessons ids — covers ~15 callsites */
  minimal: {
    droplet: { fields: ["id"] },
    viewedLessons: { fields: ["id"] },
  },
  /** droplet.id + lesson ids + viewedLessons — for progress tracking */
  withLessonIds: {
    droplet: {
      populate: { lessons: { fields: ["id"] } },
      fields: ["id"],
    },
    viewedLessons: { fields: ["id"] },
  },
  /** Full droplet display data + tags + viewedLessons — for dashboard grids */
  dashboard: {
    droplet: {
      populate: {
        lessons: { fields: ["id", "name", "slug"] },
        tags: { fields: ["id", "name", "slug"] },
      },
      fields: [
        "id",
        "name",
        "slug",
        "type",
        "focusArea",
        "averageRating",
        "description",
      ],
    },
    viewedLessons: { fields: ["id", "name", "slug"] },
  },
  /** Dashboard + usersFavorited — only for favorites grid */
  favorites: {
    droplet: {
      populate: {
        lessons: { fields: ["id", "name", "slug"] },
        tags: { fields: ["id", "name", "slug"] },
        usersFavorited: { fields: ["id"] },
      },
      fields: [
        "id",
        "name",
        "slug",
        "type",
        "focusArea",
        "averageRating",
        "description",
      ],
    },
    viewedLessons: { fields: ["id", "name", "slug"] },
  },
};
