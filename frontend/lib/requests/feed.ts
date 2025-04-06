"use server";

import { Announcement, AuthorizedUser, Droplet } from "@/types";
import qs from "qs";
import { flattenAttributes } from "../utils";
import { revalidatePath } from "next/cache";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

export async function fetchAnnouncements(
  user: AuthorizedUser,
): Promise<Announcement[]> {
  try {
    const query = qs.stringify({
      sort: ["firstCreated:desc"],
      filters: {
        $or: [
          {
            group: {
              members: {
                id: { $eq: user.id },
              },
            },
          },
          {
            playlist: {
              authorized_users: {
                id: { $eq: user.id },
              },
            },
          },
          {
            type: "friend",
            authorized_user: {
              friendships: {
                authorized_users: {
                  id: { $eq: user.id },
                },
              },
              id: { $ne: user.id },
            },
          },
          {
            type: "kudos",
            authorized_user: {
              friendships: {
                authorized_users: {
                  id: { $eq: user.id },
                },
              },
              id: { $ne: user.id },
            },
          },
          {
            droplet: {
              enrollments: {
                authorizedUser: {
                  id: { $eq: user.id },
                },
              },
            },
          },
          {
            type: "system",
          },
        ],
      },
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
          ],
          populate: {
            blocked: {
              fields: ["id"],
            },
            was_blocked: {
              fields: ["id"],
            },
          },
        },
        playlist: {
          fields: ["id", "name", "slug", "description", "isPublic"],
          populate: {
            droplets: {
              fields: ["id", "name", "slug"],
              populate: {
                lessons: {
                  fields: ["id", "name", "slug"],
                },
              },
            },
          },
        },
        droplet: {
          fields: ["id", "name", "slug"],
        },
        group: {
          fields: ["id", "name", "slug"],
        },
      },
      pagination: {
        pageSize: 100,
        page: 1,
      },
    });

    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        cache: "no-store",
      },
    );
    const data = await response.json();
    return flattenAttributes(data.data);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch announcement data.");
  }
}

export async function createFriendAnnouncement(
  droplet: Droplet,
  user: AuthorizedUser,
) {
  try {
    const curDate = new Date();
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            authorized_user: user.id,
            content: `${user.firstName ? user.firstName + " " + user.lastName : user.email} has completed ${droplet.name}. Click to give kudos!`,
            firstCreated: curDate,
            type: "friend",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    if (!response.ok) {
      console.error("Response:", await response.text());
      throw new Error("Failed to create announcement");
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function createKudosAnnouncement(
  user: AuthorizedUser,
  announcementId: number,
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/announcements/${announcementId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            kudosGiven: {
              connect: [user],
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update kudos status");
    }
  } catch (error) {
    console.error("Error updating kudos:", error);
    throw error;
  }

  try {
    const curDate = new Date();
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            authorized_user: user.id,
            content: `${user.firstName ? user.firstName + " " + user.lastName : user.email} has given you kudos`,
            firstCreated: curDate,
            type: "kudos",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    if (!response.ok) {
      console.error("Response:", await response.text());
      throw new Error("Failed to create announcement");
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function createPlaylistAnnouncement(
  playlistName: string,
  id: number,
) {
  try {
    const curDate = new Date();
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            playlist: id,
            content: `${playlistName} has been updated. Click to view this playlist!`,
            firstCreated: curDate,
            type: "playlist",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    if (!response.ok) {
      console.error("Response:", await response.text());
      throw new Error("Failed to create announcement");
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function createGroupAnnouncement(groupName: string, id: number) {
  try {
    const curDate = new Date();
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            group: id,
            content: `${groupName} has been updated. Click to view this group!`,
            firstCreated: curDate,
            type: "group",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    if (!response.ok) {
      console.error("Response:", await response.text());
      throw new Error("Failed to create announcement");
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function createDropletAnnouncement(name: string, id: number) {
  try {
    const curDate = new Date();
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            droplet: id,
            content: `${name} has been updated. Click to view this droplet!`,
            firstCreated: curDate,
            type: "droplet",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    if (!response.ok) {
      console.error("Response:", await response.text());
      throw new Error("Failed to create announcement");
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function createSystemAnnouncement(
  content: string,
  authUser: AuthorizedUser,
) {
  try {
    const curDate = new Date();
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            authorized_user: authUser.id,
            content: content,
            firstCreated: curDate,
            type: "system",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    if (!response.ok) {
      console.error("Response:", await response.text());
      throw new Error("Failed to create announcement");
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
}

export async function fetchAnnouncementById(id: number) {
  try {
    const query = qs.stringify({
      sort: ["firstCreated:desc"],
      filters: {
        id: { $eq: id },
      },
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
          ],
          populate: {
            blocked: {
              fields: ["id"],
            },
            was_blocked: {
              fields: ["id"],
            },
          },
        },
        playlist: {
          fields: ["id", "name", "slug", "description", "isPublic"],
          populate: {
            droplets: {
              fields: ["id", "name", "slug"],
              populate: {
                lessons: {
                  fields: ["id", "name", "slug"],
                },
              },
            },
          },
        },
        droplet: {
          fields: ["id", "name", "slug"],
        },
        group: {
          fields: ["id", "name", "slug"],
        },
      },
      pagination: {
        pageSize: 100,
        page: 1,
      },
    });

    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/announcements?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        cache: "no-store",
      },
    );
    const data = await response.json();
    return flattenAttributes(data.data);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch announcement data.");
  }
}
