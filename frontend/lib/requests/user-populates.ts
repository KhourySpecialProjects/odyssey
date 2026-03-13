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
      received_requests: {
        fields: ["id", "email", "firstName", "lastName", "profilePhoto"],
      },
      sent_requests: {
        fields: ["id", "email", "firstName", "lastName", "profilePhoto"],
      },
      blocked: {
        fields: ["id", "email", "firstName", "lastName", "profilePhoto"],
      },
      was_blocked: {
        fields: ["id", "email", "firstName", "lastName", "profilePhoto"],
      },
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
  dashboardFull: {
    fields: PROFILE_FIELDS,
    populate: {
      playlists: {
        populate: {
          droplets: {
            populate: { lessons: { fields: ["id", "name", "slug"] } },
          },
          users_archived: { fields: ["id"] },
        },
      },
      groups: { fields: ["id"] },
    },
  },
  creation: {
    fields: PROFILE_FIELDS,
    populate: {
      droplets: {
        fields: ["id", "name", "slug", "status", "type", "focusArea"],
      },
      created_playlists: {
        fields: ["id", "name", "slug", "isPublic"],
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
