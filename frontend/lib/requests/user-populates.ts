const PROFILE_FIELDS = [
  "id",
  "email",
  "firstName",
  "lastName",
  "bio",
  "profilePhoto",
  "linkedin",
  "github",
  "website",
  "isPublic",
  "timeZone",
  "firstTime",
];

export const USER_POPULATES = {
  minimal: {
    fields: ["id", "email"],
    populate: {},
  },
  profile: {
    fields: PROFILE_FIELDS,
    populate: {},
  },
  social: {
    fields: PROFILE_FIELDS,
    populate: {
      received_requests: { fields: ["*"] },
      sent_requests: { fields: ["*"] },
      blocked: { fields: ["*"] },
      was_blocked: { fields: ["*"] },
      friendships: {
        populate: {
          authorized_users: {
            fields: [
              "id",
              "email",
              "firstName",
              "lastName",
              "bio",
              "github",
              "linkedin",
              "profilePhoto",
              "website",
            ],
            populate: {
              blocked: { fields: ["id"] },
              was_blocked: { fields: ["id"] },
            },
          },
        },
      },
    },
  },
  dashboard: {
    fields: PROFILE_FIELDS,
    populate: {
      playlists: {
        fields: ["id", "name", "slug"],
        populate: {
          users_archived: { fields: ["id"] },
        },
      },
      groups: {
        fields: ["id"],
      },
    },
  },
  creation: {
    fields: PROFILE_FIELDS,
    populate: {
      droplets: {
        fields: ["*"],
      },
      created_playlists: {
        fields: ["*"],
        populate: {
          droplets: {
            fields: ["id", "name", "slug"],
            populate: {
              lessons: {
                fields: ["id"],
              },
            },
          },
        },
      },
    },
  },
} as const;
