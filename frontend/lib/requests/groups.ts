"use server";

import { Group, GroupListResponse, GroupSemester } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { fetchAPI } from "@/lib/utils";

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
  }: StrapiRequestParams = {}
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
  }: StrapiRequestParams = {}
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
  }: StrapiRequestParams = {}
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
  }
): Promise<Group> {
  const path = `/groups/${groupId}`;
  const { connect, disconnect } = updates;
  
  // Build the data object based on provided updates
  const data: Record<string, { connect?: number[]; disconnect?: number[] }> = {};
  
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
  role: "members" | "managers" | "admins" = "members"
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
  role: "members" | "managers" | "admins" = "members"
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
  toRole: "members" | "managers" | "admins"
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
    semester?: GroupSemester;
    initialMembers?: {
      admins?: number[];
      managers?: number[];
      members?: number[];
    };
  }
): Promise<Group> {
  const path = `/groups`;
  const { groupName, description, semester = "Open Membership", initialMembers } = data;

  // Build the creation data object
  const createData = {
    groupName,
    description,
    semester,
    creator: authorizedUserId,
    // Initialize relationships if provided
    ...(initialMembers?.admins && { admins: { connect: initialMembers.admins } }),
    ...(initialMembers?.managers && { managers: { connect: initialMembers.managers } }),
    ...(initialMembers?.members && { members: { connect: initialMembers.members } }),
  };

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
        fields: ["id", "name", "slug", "status", "focusArea","type"],
        populate: {
          lessons: {
            fields: ["id", "name", "slug", "type"]
          }
        }
      }, 
      playlists: {
        fields: ["id", "name", "slug", "isPublic"],
        populate: {
          droplets: {
            fields: ["id", "name", "slug", "type"]
          }
        }
      }
    },
  }: StrapiRequestParams = {}
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
    droplets?: Array<{
      id: number;
      order?: number;
    }>;
    playlists?: Array<{
      id: number;
      order?: number;
    }>;
  }
): Promise<Group> {
  const path = `/groups/${groupId}`;
  
  // Prepare the data object for Strapi
  const dataToSend: any = {};

  // Map basic fields
  if (data.groupName) dataToSend.name = data.groupName;
  if (data.description) dataToSend.description = data.description;
  if (data.semester) dataToSend.semester = data.semester;

  // Handle admins and managers
  if (data.admins) {
    dataToSend.admins = { 
      connect: data.admins.map(id => ({ id })) 
    };
  }

  if (data.managers) {
    dataToSend.managers = { 
      connect: data.managers.map(id => ({ id })) 
    };
  }

  // Handle droplets
  if (data.droplets) {
    dataToSend.droplets = {
      connect: data.droplets.map(droplet => ({ 
        id: droplet.id 
      }))
    };
  }

  // Handle playlists
  if (data.playlists) {
    dataToSend.playlists = {
      connect: data.playlists.map(playlist => ({ 
        id: playlist.id 
      }))
    };
  }

  return await fetchAPI<Group>(path, {
    options: { 
      method: "PUT",
      body: JSON.stringify({ data: dataToSend }),
    },
  });
}