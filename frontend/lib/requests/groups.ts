"use server";

import { Group, GroupListResponse, GroupSemester } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "@/lib/utils";
import { getAuthorizedUserByEmail } from "./authorized-user";
// import { createAuthorizedUser } from "../actions";
import type { ActionResponse } from "@/types";
import { AuthorizedUserRoleTitle } from "../globals";
import { getAuthorizedUserRoleIdByTitle } from "./authorized-user-roles";
import { createEnrollmentFromEmail } from "@/lib/actions"
import { getEnrollmentsByAuthorizedUser } from "./enrollment";
import { createEnrollment } from "@/lib/actions";
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
      }
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
      // admins?: string[];
      // managers?: string[];
      admins?: number[];
      managers?: number[];
      members?: string[];
    };
    // Add additional fields as needed for the new group creation form
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

  // Process initial members
  const [processedAdmins, processedManagers, processedMembers] =
    await Promise.all([
      // processMembers(initialMembers?.admins),
      // processMembers(initialMembers?.managers),
      initialMembers?.admins,
      initialMembers?.managers,
      processMembers(initialMembers?.members),
    ]);

  // Build the creation data object
  const createData = {
    groupName,
    description,
    semester,
    slug: `random-slug-${Math.floor(Math.random() * 90000) + 10000}`,
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

  console.log(
    "    ----> createGroup createData = ",
    JSON.stringify(createData),
  );

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
        fields: ["id", "name", "slug", "status", "focusArea", "type"],
        populate: {
          lessons: {
            fields: ["id", "name", "slug", "type"],
          },
        },
      },
      playlists: {
        fields: ["id", "name", "slug", "isPublic"],
        populate: {
          droplets: {
            fields: ["id", "name", "slug", "type"],
          },
        },
      },
    },
  }: StrapiRequestParams = {},
): Promise<Group | null> {
  const path = `/groups`;
  const urlParams = {
    filters: {
      slug: { $eq: slug },
    },
    populate,
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

  // Prepare the data object for Strapi
  const dataToSend: any = {};

  console.log("  --> updateGroup data = ", data);

  // Map basic fields
  if (data.groupName) dataToSend.groupName = data.groupName;
  if (data.description) dataToSend.description = data.description;
  if (data.semester) dataToSend.semester = data.semester;

  // Handle admins and managers
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
    // Ensure all members are authorized users first
    const authorizedMembers = await ensureAuthorizedUsers(
      data.members.map((m) => m.email).filter((e): e is string => e != null),
    );

    dataToSend.members = {
      set: authorizedMembers.map((member) => ({ id: member.id })),
    };
  }

  // Handle droplets
  if (data.droplets) {
    dataToSend.droplets = {
      set: data.droplets.map((droplet) => ({
        id: droplet.id,
      })),
    };
  }

  // Handle playlists
  if (data.playlists) {
    dataToSend.playlists = {
      set: data.playlists.map((playlist) => ({
        id: playlist.id,
      })),
    };
  }

  console.log("  --> updateGroup dataToSend = ", JSON.stringify(dataToSend));

  return await fetchAPI<Group>(path, {
    options: {
      method: "PUT",
      body: JSON.stringify({ data: dataToSend }),
    },
  });
}

//TODO this should probably be moved to lib/actions.ts
async function ensureAuthorizedUsers(
  emails: string[],
): Promise<Array<{ id: number; email: string }>> {
  const results = [];

  for (const email of emails) {
    console.log("  --> ensureAuthorizedUsers email = ", email);
    try {
      // Try to find existing authorized user
      const existingUser = await getAuthorizedUserByEmail(email);
      if (existingUser) {
        results.push({ id: existingUser.id, email });
      } else {
        // Create new authorized user if doesn't exist
        const newUser = await createAuthorizedUserInGroup(email);
        if (newUser.ok && newUser.data) {
          results.push({ id: newUser.data.id, email });
        }
      }
    } catch (error) {
      console.error(`Failed to process email: ${email}`, error);
    }
  }

  return results;
}

//TODO This function and CreateAuthorizedUser function in actions.ts
// should be merged into one function. But currently, the actions.ts version
// requires a form object.
export async function createAuthorizedUserInGroup(
  email: string,
  isEnabled: boolean = true,
): Promise<ActionResponse<{ id: number }>> {
  const roleID = await getAuthorizedUserRoleIdByTitle(
    AuthorizedUserRoleTitle.User,
  );
  console.log("    ----> createAuthorizedUserInGroup roleID = ", roleID);
  const dataToSend = {
    data: {
      email,
      isEnabled,
      roles: {
        set: [{ id: roleID }],
      },
    },
  };

  try {
    const response = await fetch(`${STRAPI_API_URL}/api/authorized-users`, {
      method: "POST",
      body: JSON.stringify(dataToSend),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
      },
    });

    const data = await response.json();

    console.log("    ----> data = ", data);

    if (!response.ok || (response.ok && data.error)) {
      return {
        ok: false,
        error: data.error?.message || "Failed to create authorized user",
        data: null,
      };
    }

    return {
      ok: true,
      message: `User ${email} created!`,
      data: { id: data.data.id },
    };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to Create Authorized User.",
      data: null,
    };
  }
}

export async function enrollUsers(group: Group) {
  console.log("enrolling users in these droplets");
  console.log("member count ", group.members?.length);
  console.log("droplet count ", group.droplets?.length);
  try {
    group.members?.map(async (member) => {
      group.droplets?.map(async (droplet) => {
        const enrollmentData = {
          droplet: droplet.id,
          viewedLessons: [],
        };
        console.log("inside the function");
        console.log("enrollment data: ", enrollmentData)
        console.log("member email: ", member.email)
        console.log("member id", member.id)
        return await createEnrollmentFromEmail(enrollmentData, member.email);
        //return await createEnrollment(enrollmentData);
      }) || []
    }) || []
  } catch (error) {
    console.error("Error enrolling users:", error);
    throw error;
  }
}
