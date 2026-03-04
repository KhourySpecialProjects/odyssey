"use server";

import { Group } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "@/lib/utils";
import { getAuthorizedUserByEmail } from "./authorized-user";
import type { Droplet, DueDate, Playlist } from "@/types";
import { revalidatePath, revalidateTag } from "next/cache";
import { enrollInPlaylist } from "./playlist-enrollment";
import { getCurrentUser } from "../auth/session";
import { createEnrollmentFromEmail, createEnrollmentDirect } from "./enrollment";
import { createAuthorizedUser } from "./authorized-user";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * Gets all groups where the authorized user has a management role (creator, admin, or manager).
 * @param authorizedUserId The ID of the authorized user
 * @param options Strapi query modifiers
 * @returns Array of groups the user can manage
 */
export async function getManagedGroups(
  authorizedUserId: number,
  {
    sort = ["groupName:asc"],
    filters = {},
    pagination = { pageSize: 25, page: 1 },
    populate = {
      members: {
        fields: ["id", "email"],
      },
      admins: {
        fields: ["id", "email"],
      },
      managers: {
        fields: ["id", "email"],
      },
      creator: {
        fields: ["id", "email"],
      },
    },
    fields = ["id", "groupName", "slug", "semester", "isArchived"],
  }: StrapiRequestParams = {},
): Promise<Group[]> {
  const path = `/groups`;
  const urlParams = {
    sort,
    filters: {
      ...filters,
      $or: [
        { creator: { id: { $eq: authorizedUserId } } },
        { admins: { id: { $eq: authorizedUserId } } },
        { managers: { id: { $eq: authorizedUserId } } },
      ],
    },
    populate,
    fields,
    pagination,
  };

  return await fetchAPI<Group[]>(path, {
    urlParams,
    cache: "no-store",
  });
}

/**
 * Gets a specific group by its slug, including full member details if the user has permission.
 * @param slug The unique slug of the desired group
 * @param authorizedUserId The ID of the authorized user requesting access
 * @param options Strapi query modifiers
 * @returns The group if found and user has access, null otherwise
 */
export async function getGroupBySlug(
  slug: string,
  authorizedUserId: number,
  {
    populate = {
      members: {
        fields: ["id", "email"],
      },
      admins: {
        fields: ["id", "email"],
      },
      managers: {
        fields: ["id", "email"],
      },
      creator: {
        fields: ["id", "email"],
      },
    },
  }: StrapiRequestParams = {},
): Promise<Group | null> {
  const path = `/groups`;
  const urlParams = {
    filters: {
      slug: { $eq: slug },
      $or: [
        { creator: { id: { $eq: authorizedUserId } } },
        { admins: { id: { $eq: authorizedUserId } } },
        { managers: { id: { $eq: authorizedUserId } } },
      ],
    },
    populate,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  return await fetchAPI<Group[]>(path, {
    urlParams,
    cache: "no-store",
  }).then((groups) => groups[0] || null);
}

/**
 * Gets a specific group by its slug, including full member details if the user has permission.
 * @param id The ID of the authorized user requesting access
 * @param options Strapi query modifiers
 * @returns The group if found and user has access, null otherwise
 */
export async function getGroupByID(
  id: number,
  {
    populate = {
      members: {
        populate: {
          playlists: {
            fields: ["id", "name"],
          },
        },
        fields: ["id", "email"],
      },
      admins: {
        fields: ["id", "email"],
      },
      managers: {
        fields: ["id", "email"],
      },
      creator: {
        fields: ["id", "email"],
      },
      droplets: {
        fields: ["id"],
      },
      playlists: {
        populate: {
          droplets: {
            fields: ["id", "name", "slug", "type", "focusArea"],
          },
        },
        fields: ["id", "name", "slug"],
      },
    },
  }: StrapiRequestParams = {},
): Promise<Group> {
  const path = `/groups`;
  const urlParams = {
    filters: {
      id: { $eq: id },
    },
    populate,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  revalidatePath("/dashboard");
  revalidatePath("/explore");

  return await fetchAPI<Group[]>(path, {
    urlParams,
    cache: "no-store",
  }).then((groups) => groups[0]);
}

/**
 * Gets all groups where the authorized user is a member (including groups they manage).
 * @param authorizedUserId The ID of the authorized user
 * @param options Strapi query modifiers
 * @returns Array of groups the user belongs to
 */
export async function getUserGroups(
  authorizedUserId: number,
  {
    sort = ["groupName:asc"],
    filters = {},
    pagination = { pageSize: 25, page: 1 },
    populate = {
      members: {
        fields: ["id", "email"],
      },
      admins: {
        fields: ["id", "email"],
      },
      managers: {
        fields: ["id", "email"],
      },
      creator: {
        fields: ["*"],
      },
      users_archived: {
        fields: ["*"],
      },
    },
    fields = ["id", "groupName", "slug", "semester", "isArchived"],
  }: StrapiRequestParams = {},
): Promise<Group[]> {
  const path = `/groups`;
  const urlParams = {
    sort,
    filters: {
      ...filters,
      $or: [
        { creator: { id: { $eq: authorizedUserId } } },
        { admins: { id: { $eq: authorizedUserId } } },
        { managers: { id: { $eq: authorizedUserId } } },
        { members: { id: { $eq: authorizedUserId } } },
      ],
    },
    populate,
    fields,
    pagination,
  };

  return await fetchAPI<Group[]>(path, {
    urlParams,
    cache: "no-store",
  });
}

/**
 * Updates the members of a group. Requires management permissions.
 * @param groupId The ID of the group to update
 * @param updates The member updates to apply
 * @returns The updated group
 */
export async function updateGroupMembers(
  groupId: number,
  updates: {
    connect?: { role: "members" | "managers" | "admins"; userIds: number[] };
    disconnect?: { role: "members" | "managers" | "admins"; userIds: number[] };
  },
): Promise<Group> {
  const path = `/groups/${groupId}`;
  const { connect, disconnect } = updates;

  // Build the data object based on provided updates
  const data: Record<string, { connect?: number[]; disconnect?: number[] }> =
    {};

  if (connect) {
    data[connect.role] = { connect: connect.userIds };
  }

  if (disconnect) {
    data[disconnect.role] = { disconnect: disconnect.userIds };
  }

  return await fetchAPI<Group>(path, {
    options: {
      method: "PUT",
      body: JSON.stringify({ data }),
    },
  });
}

/**
 * Helper function to add members to a group
 */
export async function addGroupMembers(
  groupId: number,
  userIds: number[],
  role: "members" | "managers" | "admins" = "members",
): Promise<Group> {
  return updateGroupMembers(groupId, {
    connect: { role, userIds },
  });
}

/**
 * Helper function to remove members from a group
 */
export async function removeGroupMembers(
  groupId: number,
  userIds: number[],
  role: "members" | "managers" | "admins" = "members",
): Promise<Group> {
  return updateGroupMembers(groupId, {
    disconnect: { role, userIds },
  });
}

/**
 * Changes a user's role within a group
 */
export async function changeGroupMemberRole(
  groupId: number,
  userId: number,
  fromRole: "members" | "managers" | "admins",
  toRole: "members" | "managers" | "admins",
): Promise<Group> {
  return updateGroupMembers(groupId, {
    disconnect: { role: fromRole, userIds: [userId] },
    connect: { role: toRole, userIds: [userId] },
  });
}

/**
 * Creates a new group with the specified creator and optional initial members.
 * @param authorizedUserId The ID of the user creating the group (becomes creator)
 * @param data The group data
 * @returns The created group
 */
export async function createGroup(
  authorizedUserId: number,
  data: {
    groupName: string;
    description?: string;
    semester?: string;
    initialMembers?: {
      admins?: number[];
      managers?: number[];
      members?: string[];
    };
    droplets?: number[];
    playlists?: number[];
  },
): Promise<Group> {
  const path = `/groups`;
  const {
    groupName,
    description,
    semester = "Open Membership",
    initialMembers,
    droplets,
    playlists,
  } = data;

  const processMembers = async (emails?: string[]) => {
    if (!emails || emails.length === 0) return undefined;
    const authorizedMembers = await ensureAuthorizedUsers(emails);
    return authorizedMembers.map((member) => ({ id: member.id }));
  };

  const [processedAdmins, processedManagers, processedMembers] =
    await Promise.all([
      initialMembers?.admins,
      initialMembers?.managers,
      processMembers(initialMembers?.members),
    ]);

  // Build the creation data object
  const createData = {
    groupName,
    description,
    semester,
    slug: `${groupName.replace(/\s+/g, "-").toLowerCase()}-${Math.floor(Math.random() * 90000) + 10000}`,
    creator: authorizedUserId,
    ...(processedAdmins && {
      admins: { set: processedAdmins },
    }),
    ...(processedManagers && {
      managers: { set: processedManagers },
    }),
    ...(processedMembers && {
      members: { set: processedMembers },
    }),
    ...(droplets && {
      droplets: { connect: droplets.map((id) => ({ id })) },
    }),
    ...(playlists && {
      playlists: { connect: playlists.map((id) => ({ id })) },
    }),
  };
  revalidatePath("/g/dashboard");
  revalidatePath("/g/dashboard?tab=creator");
  return await fetchAPI<Group>(path, {
    options: {
      method: "POST",
      body: JSON.stringify({ data: createData }),
    },
  });
}

export async function getGroupBySlugV2(
  slug: string,
  {
    populate = {
      members: {
        fields: ["id", "email", "firstName", "lastName", "profilePhoto"],
      },
      admins: {
        fields: ["id", "email", "firstName", "lastName", "profilePhoto"],
      },
      managers: {
        fields: ["id", "email", "firstName", "lastName", "profilePhoto"],
      },
      creator: {
        fields: ["id", "email", "firstName", "lastName", "profilePhoto"],
      },
      droplets: {
        fields: [
          "id",
          "name",
          "slug",
          "status",
          "focusArea",
          "type",
          "averageRating",
          "description",
        ],
        populate: {
          lessons: {
            fields: ["id", "name", "slug", "type"],
          },
        },
        sort: "name:asc",
      },
      playlists: {
        fields: ["id", "name", "slug", "isPublic"],
        populate: {
          droplets: {
            fields: ["id", "name", "slug", "type"],
          },
        },
        sort: "name:asc",
      },
    },
    fields = ["*", "dropletDueDates"],
  }: StrapiRequestParams = {},
): Promise<Group | null> {
  const path = `/groups`;
  const urlParams = {
    filters: {
      slug: { $eq: slug },
    },
    populate,
    fields,
  };

  const groups = await fetchAPI<Group[]>(path, {
    urlParams,
    cache: "no-store",
  });

  return groups[0] || null;
}

export async function updateGroup(
  groupId: number,
  data: {
    groupName?: string;
    description?: string;
    semester?: string;
    isArchived?: boolean;
    admins?: number[];
    managers?: number[];
    members?: Array<{
      email: string | null;
      roles?: string[];
      isActive?: boolean;
      id?: number;
    }>;
    droplets?: Array<{
      id: number;
      name?: string;
      slug?: string;
      focusArea?: string;
      type?: string;
      order?: number;
      lessons?: Array<{
        id: number;
        name?: string;
        slug?: string;
      }>;
    }>;
    playlists?: Array<{
      id: number;
      name?: string;
      slug?: string;
      isPublic?: boolean;
      duration?: string;
      order?: number;
      droplets?: Array<{
        id: number;
        name?: string;
      }>;
    }>;
  },
): Promise<Group> {
  const path = `/groups/${groupId}`;

  const dataToSend: any = {};

  if (data.groupName) dataToSend.groupName = data.groupName;
  if (data.description) dataToSend.description = data.description;
  if (data.semester) dataToSend.semester = data.semester;
  if (data.isArchived !== undefined) dataToSend.isArchived = data.isArchived;

  if (data.admins) {
    dataToSend.admins = {
      set: data.admins.map((id) => ({ id })),
    };
  }

  if (data.managers) {
    dataToSend.managers = {
      set: data.managers.map((id) => ({ id })),
    };
  }

  if (data.members) {
    const authorizedMembers = await ensureAuthorizedUsers(
      data.members.map((m) => m.email).filter((e): e is string => e != null),
    );

    dataToSend.members = {
      set: authorizedMembers.map((member) => ({ id: member.id })),
    };
  }

  if (data.droplets) {
    dataToSend.droplets = {
      set: data.droplets.map((droplet) => ({
        id: droplet.id,
      })),
    };
  }

  if (data.playlists) {
    dataToSend.playlists = {
      set: data.playlists.map((playlist) => ({
        id: playlist.id,
      })),
    };
  }

  revalidatePath("/admin");

  return await fetchAPI<Group>(path, {
    options: {
      method: "PUT",
      body: JSON.stringify({ data: dataToSend }),
    },
  });
}

async function ensureAuthorizedUsers(
  emails: string[],
): Promise<Array<{ id: number; email: string }>> {
  const results = [];

  for (const email of emails) {
    try {
      const existingUser = await getAuthorizedUserByEmail(email);
      if (existingUser) {
        results.push({ id: existingUser.id, email });
      } else {
        const formData = new FormData();
        formData.append("email", email);
        formData.append("isEnabled", "true");
        const newUser = await createAuthorizedUser(formData);
        const newUserData = await getAuthorizedUserByEmail(email);
        if (newUser.ok && newUserData) {
          results.push({ id: newUserData.id, email });
        }
      }
    } catch (error) {
      console.error(`Failed to process email: ${email}`, error);
    }
  }

  return results;
}

export async function enrollUsers(group: Group) {
  try {
    const allDropletIds = [
      ...(group.droplets?.map((d) => d.id) || []),
      ...(group.playlists?.flatMap((p) => p.droplets?.map((d) => d.id) || []) || []),
    ];
    const uniqueDropletIds = [...new Set(allDropletIds)];
    const memberIds = group.members?.map((m) => m.id) || [];

    if (memberIds.length === 0) return;

    // 1 query: get all existing enrollments for these members + these droplets
    const existingEnrollments = uniqueDropletIds.length > 0 ? await fetchAPI<any[]>("/enrollments", {
      urlParams: {
        filters: {
          authorizedUser: { id: { $in: memberIds } },
          droplet: { id: { $in: uniqueDropletIds } },
        },
        fields: ["id"],
        populate: {
          authorizedUser: { fields: ["id"] },
          droplet: { fields: ["id"] },
        },
        pagination: { pageSize: 1000, page: 1 },
      },
    }) : [];

    // Build set of "userId-dropletId" for quick lookup
    const existingSet = new Set(
      existingEnrollments.map((e) => `${e.authorizedUser?.id}-${e.droplet?.id}`)
    );

    // Create only missing enrollments in parallel
    const creates = [];
    for (const member of group.members || []) {
      for (const dropletId of uniqueDropletIds) {
        if (!existingSet.has(`${member.id}-${dropletId}`)) {
          creates.push(createEnrollmentDirect(dropletId, member.id));
        }
      }
    }
    await Promise.all(creates);

    // Enroll in playlists in parallel
    const playlistEnrolls = [];
    for (const member of group.members || []) {
      for (const playlist of group.playlists || []) {
        playlistEnrolls.push(enrollInPlaylist(playlist.id, member.id));
      }
    }
    await Promise.all(playlistEnrolls);
  } catch (error) {
    console.error("Error enrolling users:", error);
    throw error;
  }
}

//NEW REQUESTS FOR DUE DATE COLLECTION TYPE

export async function assignDropletDueDate(
  date: string | null,
  group: Group,
  droplet: Droplet,
) {
  try {
    if (!group.members || group.members.length === 0) {
      return { success: false, error: "No members found in the group" };
    }

    const dueDatePromises = group.members.map(async (member) => {
      const existingDueDateResponse = await fetch(
        `${STRAPI_API_URL}/api/due-dates?filters[authorized_user][id][$eq]=${member.id}&filters[droplet][id][$eq]=${droplet.id}&filters[group][id][$eq]=${group.id}`,
        {
          headers: {
            Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
          },
        },
      );

      const existingDueDates = await existingDueDateResponse.json();

      if (existingDueDates.data && existingDueDates.data.length > 0) {
        const existingDueDate = existingDueDates.data[0];
        const response = await fetch(
          `${STRAPI_API_URL}/api/due-dates/${existingDueDate.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              data: {
                dueDate: date,
              },
            }),
          },
        );

        if (!response.ok) {
          console.error(
            `Failed to update due date for user ${member.id}:`,
            await response.text(),
          );
          return false;
        }
      } else {
        const response = await fetch(`${STRAPI_API_URL}/api/due-dates`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            data: {
              dueDate: date,
              authorized_user: member.id,
              droplet: droplet.id,
              group: group.id,
            },
          }),
        });

        if (!response.ok) {
          console.error(
            `Failed to add due date for user ${member.id}:`,
            await response.text(),
          );
          return false;
        }
      }

      return true;
    });

    const results = await Promise.all(dueDatePromises);

    const allSuccessful = results.every((result) => result === true);

    if (!allSuccessful) {
      return {
        success: false,
        error: "Failed to process due dates for some users",
      };
    }

    revalidatePath("/explore");
    revalidatePath("/dashboard");
    revalidatePath("/groups/g/[slug]", "page");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error processing droplet due dates:", error);
    return { success: false, error: "Failed to process request" };
  }
}

export async function assignPlaylistDueDate(
  date: string | null,
  group: Group,
  playlist: Playlist,
) {
  try {
    if (!group.members || group.members.length === 0) {
      return { success: false, error: "No members found in the group" };
    }

    const dueDatePromises = group.members.map(async (member) => {
      const existingDueDateResponse = await fetch(
        `${STRAPI_API_URL}/api/due-dates?filters[authorized_user][id][$eq]=${member.id}&filters[playlist][id][$eq]=${playlist.id}&filters[group][id][$eq]=${group.id}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
          },
        },
      );

      const existingDueDates = await existingDueDateResponse.json();

      if (existingDueDates.data && existingDueDates.data.length > 0) {
        const existingDueDate = existingDueDates.data[0];
        const response = await fetch(
          `${STRAPI_API_URL}/api/due-dates/${existingDueDate.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              data: {
                dueDate: date,
              },
            }),
          },
        );

        if (!response.ok) {
          console.error(
            `Failed to update due date for user ${member.id}:`,
            await response.text(),
          );
          return false;
        }
      } else {
        const response = await fetch(`${STRAPI_API_URL}/api/due-dates`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            data: {
              dueDate: date,
              authorized_user: member.id,
              playlist: playlist.id,
              group: group.id,
            },
          }),
        });

        if (!response.ok) {
          console.error(
            `Failed to add due date for user ${member.id}:`,
            await response.text(),
          );
          return false;
        }
      }

      return true;
    });

    const results = await Promise.all(dueDatePromises);

    const allSuccessful = results.every((result) => result === true);

    if (!allSuccessful) {
      return {
        success: false,
        error: "Failed to process due dates for some users",
      };
    }

    revalidatePath("/explore");
    revalidatePath("/dashboard");
    revalidatePath("/groups/g/[slug]", "page");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error processing playlist due dates:", error);
    return { success: false, error: "Failed to process request" };
  }
}

//gets AuthorizedUser's enrollment in Droplet
export async function getGroupDueDate(item: Droplet | Playlist, group: Group) {
  try {
    const dueDates = await fetchAPI<DueDate[]>(`/due-dates`, {
      urlParams: {
        filters: {
          group: {
            id: { $eq: group.id },
          },
          ...("type" in item
            ? {
                droplet: { id: { $eq: item.id } },
              }
            : {
                playlist: { id: { $eq: item.id } },
              }),
        },
      },
    });

    return dueDates[0];
  } catch (error) {
    console.error("Error getting due date:", error);
    return { success: false, error };
  }
}

export async function getGroupDueDates(
  group: Group,
  {
    sort = ["dueDate:asc"],
    pagination = { pageSize: 250, page: 1 },
    fields,
  }: StrapiRequestParams = {},
): Promise<DueDate[]> {
  const path = `/due-dates`;
  const urlParams = {
    sort,
    filters: {
      $and: [{ group: { id: { $eq: group.id } } }],
    },
    populate: {
      droplet: {
        fields: ["id", "name", "slug"],
      },
      playlist: {
        fields: ["id", "name", "slug"],
      },
    },
    fields: [...(fields || []), "dueDate"],
    pagination,
    revalidate: 0,
  };

  return await fetchAPI<DueDate[]>(path, {
    urlParams,
    cache: "no-store",
    next: {
      revalidate: 0,
      tags: ["due-dates"],
    },
  });
}

export async function getUserDueDates(
  authorizedUserId: number,
  {
    sort = ["dueDate:asc"],
    filters,
    pagination = { pageSize: 250, page: 1 },
    populate,
    fields,
  }: StrapiRequestParams = {},
): Promise<DueDate[]> {
  const path = `/due-dates`;
  const urlParams = {
    sort,
    filters: {
      $and: [{ authorized_user: { id: { $eq: authorizedUserId } } }],
    },
    populate: {
      droplet: {
        fields: ["id", "name", "slug"],
      },
      playlist: {
        fields: ["id", "name", "slug"],
      },
    },
    fields: [...(fields || []), "dueDate"],
    pagination,
    revalidate: 0,
    cache: "no-store",
  };

  return await fetchAPI<DueDate[]>(path, {
    urlParams,
    next: { tags: ["due-dates"], revalidate: 0 },
  });
}

export async function deleteGroup(id: number) {
  try {
    const group = await getGroupByID(id);

    const response = await fetch(STRAPI_API_URL + "/api/groups/" + id, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: "Failed to delete group.", data: null };
    }

    revalidateTag("authors");
    revalidateTag("groups");
    revalidatePath("(general)/my-content", "page");
    return { ok: true, error: null, data: data.data };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Delete Group." };
  }
}

export async function archiveGroup(group: Group, archiveState: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) throw new Error("No email identified");
    const authorizedUser = await getAuthorizedUserByEmail(user.email);

    const requestBody = {
      data: {
        users_archived: archiveState
          ? { connect: [{ id: authorizedUser.id }] }
          : { disconnect: [{ id: authorizedUser.id }] },
      },
    };

    const response = await fetch(`${STRAPI_API_URL}/api/groups/${group.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Archive group error response:", responseText);
      console.error("Response status:", response.status);
      throw new Error("Failed to archive group");
    }

    revalidateTag("dashboard");
    revalidatePath("/");
    revalidatePath("/draft");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/archived");
    return { success: true };
  } catch (error) {
    console.error("Error archiving group:", error);
    return { success: false, error };
  }
}
