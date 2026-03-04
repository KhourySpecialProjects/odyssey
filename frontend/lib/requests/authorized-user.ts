"use server";
import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { AuthorizedUser } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { revalidatePath, revalidateTag } from "next/cache";
import qs from "qs";
import { AuthorizedUserSchema } from "../validations/authorized-user";
import { getAuthorizedUserRoleIdByTitle } from "./authorized-user-roles";
import { AuthorizedUserRoleTitle } from "../globals";
import { CACHE_TAGS } from "../cache-tags";
import { USER_POPULATES } from "./user-populates";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * Gets the desired authorized user by its unique email.
 * @param email The unique email of the desired authorized user.
 * @param options Strapi query modifiers.
 * @returns The authorized user.
 */
export async function getAuthorizedUserByEmail<
  T extends Partial<AuthorizedUser> = AuthorizedUser,
>(
  email: string,
  {
    sort,
    filters,
    populate = USER_POPULATES.minimal.populate,
    fields = [...USER_POPULATES.minimal.fields],
  }: StrapiRequestParams = {},
): Promise<T> {
  const path = `/authorized-users`;
  const urlParams = {
    sort,
    filters: {
      ...filters,
      email: { $eq: email },
    },
    populate,
    fields,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  return await fetchAPI<T[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.users], revalidate: 900 },
  }).then((authorizedUsers) => authorizedUsers[0]);
}

/**
 * Batch-fetches authorized users whose email is in the given list.
 * Returns only `id` and `email` — designed for membership resolution, not
 * full profile loads.
 */
export async function getAuthorizedUsersByEmails(
  emails: string[],
): Promise<Array<{ id: number; email: string }>> {
  if (emails.length === 0) return [];

  const path = `/authorized-users`;
  const PAGE_SIZE = 100;

  // Chunk emails to stay within Strapi's maxLimit, then fetch all chunks in parallel
  const chunks: string[][] = [];
  for (let i = 0; i < emails.length; i += PAGE_SIZE) {
    chunks.push(emails.slice(i, i + PAGE_SIZE));
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
      fetchAPI<Array<{ id: number; email: string }>>(path, {
        urlParams: {
          filters: { email: { $in: chunk } },
          fields: ["id", "email"],
          pagination: { pageSize: PAGE_SIZE, page: 1 },
        },
      }),
    ),
  );

  return results.flat();
}

export async function fetchAuthorizedUsers(): Promise<AuthorizedUser[]> {
  try {
    let page = 1;
    const pageSize = 250;
    let allUsers: AuthorizedUser[] = [];

    while (true) {
      const query = qs.stringify({
        sort: ["id"],
        fields: [
          "id",
          "email",
          "isEnabled",
          "firstName",
          "lastName",
          "bio",
          "profilePhoto",
          "linkedin",
          "github",
          "website",
        ],
        populate: {
          roles: { fields: ["title"] },
        },
        pagination: {
          page,
          pageSize,
        },
      });

      const response = await fetch(
        `${NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users?${query}`,
        {
          headers: { Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}` },
          next: { tags: [CACHE_TAGS.users], revalidate: 900 },
        },
      );
      const data = await response.json();

      const users = flattenAttributes(data.data);
      allUsers = allUsers.concat(users);

      // If we got fewer than pageSize, we reached the end
      if (users.length < pageSize) break;

      page++; // fetch next page
    }

    // Deduplicate by id in case of overlapping pages
    const seen = new Set<number>();
    allUsers = allUsers.filter((user) => {
      if (seen.has(user.id)) return false;
      seen.add(user.id);
      return true;
    });

    return allUsers;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch authorized users data.");
  }
}

export async function searchAuthorizedUsers(query: string) {
  return fetchAPI<AuthorizedUser[]>("/authorized-users", {
    urlParams: {
      filters: {
        $or: [
          { email: { $containsi: query } },
          { firstName: { $containsi: query } },
          { lastName: { $containsi: query } },
        ],
      },
      fields: ["id", "email", "firstName", "lastName", "profilePhoto"],
      pagination: { pageSize: 20, page: 1 },
    },
  });
}

// Gets just one enrollment but also returns the response metadata to get pagination data
export async function fetchAuthorizedUsersMetadata({
  sort,
  filters,
  pagination = { pageSize: 1, page: 1 },
  populate,
  fields = ["id"],
}: StrapiRequestParams = {}): Promise<{
  data: AuthorizedUser[];
  meta: {
    pagination: {
      page: number;
      pageCount: number;
      pageSize: number;
      total: number;
    };
  };
}> {
  const path = `/authorized-users`;
  const urlParams = {
    sort,
    filters,
    populate,
    fields,
    pagination,
  };

  try {
    const response = await fetchAPI<{
      data: AuthorizedUser[];
      meta: {
        pagination: {
          page: number;
          pageCount: number;
          pageSize: number;
          total: number;
        };
      };
    }>(path, {
      urlParams,
      cache: "no-store",
      flattenResponse: false,
    });

    return response;
  } catch (error) {
    console.error("Error fetching authorized users metadata:", error);
    return Promise.reject(new Error("Error getting authorized users metadata"));
  }
}

export async function fetchContentCreators(): Promise<AuthorizedUser[]> {
  try {
    const query = qs.stringify({
      sort: ["lastName"],
      filters: {
        roles: {
          title: {
            $eq: "Content Creator",
          },
        },
      },
      fields: [
        "id",
        "email",
        "isEnabled",
        "firstName",
        "lastName",
        "bio",
        "profilePhoto",
        "linkedin",
        "github",
        "website",
      ],
      populate: {
        roles: {
          fields: ["id", "title"],
        },
        blocked: {
          fields: ["id"],
        },
        was_blocked: {
          fields: ["id"],
        },
        droplets: {
          fields: ["id"],
        },
      },
      pagination: {
        pageSize: 100,
        page: 1,
      },
    });
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/authorized-users?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        next: { tags: [CACHE_TAGS.authors], revalidate: 3600 },
      },
    );
    const data = await response.json();
    return flattenAttributes(data.data);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch content creators.");
  }
}
const WEBSITE_CREATOR_ORDER = [
  "sella.j@northeastern.edu",
  "palazzi.r@northeastern.edu",
  "palmer.gi@northeastern.edu",
  "houser.ch@northeastern.edu",
  "j.almanzar@northeastern.edu",
  "d.saadat@northeastern.edu",
  "chapman.w@northeastern.edu",
  "singh.simran@northeastern.edu",
];

export async function fetchWebsiteCreators(): Promise<AuthorizedUser[]> {
  try {
    const query = qs.stringify({
      filters: {
        email: {
          $in: WEBSITE_CREATOR_ORDER,
        },
      },
      fields: [
        "id",
        "email",
        "isEnabled",
        "firstName",
        "lastName",
        "bio",
        "profilePhoto",
        "linkedin",
        "github",
        "website",
      ],
      populate: {
        roles: {
          fields: ["id", "title"],
        },
        blocked: {
          fields: ["id"],
        },
        was_blocked: {
          fields: ["id"],
        },
      },
      pagination: {
        pageSize: 50,
        page: 1,
      },
    });

    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/authorized-users?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        next: { tags: [CACHE_TAGS.authors], revalidate: 3600 },
      },
    );

    const data = await response.json();
    let creators: AuthorizedUser[] = flattenAttributes(data.data);

    // Sort by the custom order array
    creators.sort((a, b) => {
      const indexA = WEBSITE_CREATOR_ORDER.indexOf(a.email);
      const indexB = WEBSITE_CREATOR_ORDER.indexOf(b.email);

      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return creators;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch website creators.");
  }
}

export async function fetchIsAuthorizedUser(email: string) {
  try {
    const query = qs.stringify({
      filters: {
        email: {
          $eq: email,
        },
      },
      fields: ["id", "isEnabled"],
      pagination: {
        pageSize: 1,
        page: 1,
      },
    });
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/authorized-users?" + query,
      {
        headers: { Authorization: "Bearer " + STRAPI_ACCESS_TOKEN },
        cache: "no-store",
      },
    );
    const data = await response.json();
    const authorizedUsers = flattenAttributes(data.data);
    return authorizedUsers.length > 0 && authorizedUsers[0]["isEnabled"];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch authorized users data.");
  }
}

const CreateAuthorizedUser = AuthorizedUserSchema.omit({
  id: true,
});
export async function createAuthorizedUser(formData: FormData) {
  // Determine which parameter is the FormData

  const roleID = await getAuthorizedUserRoleIdByTitle(
    AuthorizedUserRoleTitle.User,
  );

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formData.get("email")) {
    return { ok: false, error: "No email provided", data: null };
  }
  if (!emailRegex.test(formData.get("email") as string)) {
    return { ok: false, error: "Not a valid email", data: null };
  }

  const { email, isEnabled } = CreateAuthorizedUser.parse({
    email: formData.get("email"),
    isEnabled: formData.get("isEnabled"),
  });

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
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/authorized-users",
      {
        method: "POST",
        body: JSON.stringify(dataToSend),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );
    const data = await response.json();
    if (!response.ok || (response.ok && data.error))
      return { ok: false, error: data.error.message, data: null };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Create Authorized User." };
  }

  revalidatePath("/admin");
  return { message: `User ${email} created!`, ok: true };
}

export async function createBatchAuthorizedUsers(emails: string[]) {
  try {
    const roleID = await getAuthorizedUserRoleIdByTitle(
      AuthorizedUserRoleTitle.User,
    );

    const results = {
      successful: [] as string[],
      failed: [] as { email: string; reason: string }[],
    };

    const createUserPromises = emails.map(async (email) => {
      try {
        const dataToSend = {
          data: {
            email,
            isEnabled: true,
            roles: {
              set: [{ id: roleID }],
            },
          },
        };

        const response = await fetch(
          NEXT_PUBLIC_STRAPI_API_URL + "/api/authorized-users",
          {
            method: "POST",
            body: JSON.stringify(dataToSend),
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
            },
          },
        );
        const data = await response.json();

        if (!response.ok || (response.ok && data.error)) {
          results.failed.push({
            email,
            reason: data.error?.message || `HTTP ${response.status}`,
          });
        } else {
          results.successful.push(email);
        }
      } catch (error) {
        results.failed.push({
          email,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    await Promise.all(createUserPromises);

    revalidatePath("/admin");
    return {
      ok: true,
      data: results,
      message: `Successfully created ${results.successful.length} users, ${results.failed.length} failed`,
    };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to create batch authorized users.",
      data: null,
    };
  }
}

export async function updateUserInfo(
  userId: number,
  updates: {
    first?: string | null;
    last?: string | null;
    bio?: string | null;
    roles?: AuthorizedUserRoleTitle[];
    profilePhoto?: string | null;
    isEnabled?: boolean;
    isPublic?: boolean;
    firstTime?: boolean;
    linkedin?: string | null;
    github?: string | null;
    photo?: string | null;
    website?: string | null;
  },
) {
  try {
    const {
      first,
      last,
      bio,
      roles,
      profilePhoto,
      isEnabled,
      isPublic,
      firstTime,
      linkedin,
      github,
      photo,
      website,
    } = updates;
    const roleIds = roles
      ? await Promise.all(
          roles.map((role) => getAuthorizedUserRoleIdByTitle(role)),
        )
      : [];

    const data: any = {};

    if (first !== undefined) data.firstName = first;
    if (last !== undefined) data.lastName = last;
    if (bio !== undefined) data.bio = bio;
    if (profilePhoto !== undefined) data.profilePhoto = profilePhoto;
    if (isEnabled !== undefined) data.isEnabled = isEnabled;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (firstTime !== undefined) data.firstTime = updates.firstTime;
    if (linkedin !== undefined) data.linkedin = linkedin;
    if (github !== undefined) data.github = github;
    if (website !== undefined) data.website = website;
    if (photo !== undefined) data.profilePhoto = photo;
    if (roles && roles.length > 0) {
      data.roles = {
        set: roleIds.map((id) => ({ id })),
      };
    }

    await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ data }),
      },
    );
    revalidateTag(CACHE_TAGS.users);
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Error updating user info:", error);
    return { success: false, error };
  }
}

const DeleteAuthorizedUser = AuthorizedUserSchema.omit({
  email: true,
  isEnabled: true,
});
export async function deleteAuthorizedUser(formData: FormData) {
  const { id } = DeleteAuthorizedUser.parse({
    id: formData.get("id"),
  });

  try {
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/authorized-users/" + id,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );
    const data = await response.json();
    if (!response.ok || (response.ok && data.error))
      return { ok: false, error: data.error.message, data: null };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Delete Authorized User." };
  }

  revalidatePath("/admin");
}

// fetching content editors
export async function fetchContentEditors(): Promise<AuthorizedUser[]> {
  // create a query for the backend
  const query = qs.stringify({
    filters: {
      roles: {
        title: {
          $eq: "Content Editor",
        },
      },
    },
    fields: ["id", "username", "email"],
    populate: {},
    sort: ["username"],
    pagination: {
      pageSize: 100,
      page: 1,
    },
  });

  const response = await fetch(`/api/authorized-users?${query}`);

  // finally got response, so handle it
  if (!response.ok) {
    throw new Error("Could not get content editors");
  }

  // get the json from response and return
  const data = await response.json();
  return data.users;
}
