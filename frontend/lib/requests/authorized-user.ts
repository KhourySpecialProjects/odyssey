"use server"
import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { AuthorizedUser } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import { revalidatePath } from "next/cache";
import qs from "qs";
import { AuthorizedUserSchema } from "../validations/authorized-user";
import { getAuthorizedUserRoleIdByTitle } from "./authorized-user-roles";
import { AuthorizedUserRoleTitle } from "../globals";

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
    populate = {
      received_requests: {
        fields: ["id", "email", "firstName", "lastName", "bio", "profilePhoto"],
      },
      sent_requests: {
        fields: ["id", "email", "firstName", "lastName", "bio", "profilePhoto"],
      },
      blocked: {
        fields: ["id", "email", "firstName", "lastName", "bio", "profilePhoto"],
      },
      was_blocked: {
        fields: ["id", "email", "firstName", "lastName", "bio", "profilePhoto"],
      },
      droplets: {
        fields: ["*"],
      },
      created_playlists: {
        fields: ["*"],
        populate: {
          droplets: {
            fields: "*",
          },
        },
      },
      playlists: {
        fields: ["*"],
        populate: {
          droplets: {
            fields: "*",
          },
        },
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
        },
      },
      groups: {
        populate: {
          playlists: {
            fields: ["id"],
          },
        },
        fields: ["id"],
      },
    },
    fields = [
      "*",
      "firstName",
      "lastName",
      "bio",
      "id",
      "timeZone",
      "linkedin",
      "github",
    ],
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

  return await fetchAPI<T[]>(path, { urlParams }).then(
    (authorizedUsers) => authorizedUsers[0],
  );
}

export async function fetchAuthorizedUsers(): Promise<AuthorizedUser[]> {
  try {
    const query = qs.stringify({
      sort: ["lastName"],
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
      ],
      populate: {
        roles: { fields: ["title"] },
      },
      pagination: {
        pageSize: 500,
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
    return authorizedUsers;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch authorized users data.");
  }
}

//Gets just one enrollment but also returns the response metadata to get pagination data
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
      next: { tags: ["authorized-users"], revalidate: 0 },
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
        cache: "no-store",
      },
    );
    const data = await response.json();
    return flattenAttributes(data.data);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch content creators.");
  }
}

export async function fetchWebsiteCreators(): Promise<AuthorizedUser[]> {
  try {
    const query = qs.stringify({
      sort: ["lastName"],
      filters: {
        roles: {
          title: {
            $eq: "Website Creator",
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
        pageSize: 100,
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
    return flattenAttributes(data.data);
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

export async function getAllAuthorizedUsers(): Promise<AuthorizedUser[]> {
  try {
    const query = qs.stringify({
      sort: ["lastName:asc"],
      fields: ["email", "firstName", "lastName"],
      populate: {
        roles: {
          fields: ["id", "title"],
        },
      },
      pagination: {
        pageSize: 1000,
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
    return authorizedUsers;
  } catch (error) {
    throw new Error("Failed to fetch authorized users:");
  }
}

const CreateAuthorizedUser = AuthorizedUserSchema.omit({
  id: true,
});
export async function createAuthorizedUser(prevState: any, formData: FormData) {
  const roleID = await getAuthorizedUserRoleIdByTitle(
    AuthorizedUserRoleTitle.User,
  );

  const emailRegex = /^[^\s@]+@northeastern\.edu$/;
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
    const response = await fetch(NEXT_PUBLIC_STRAPI_API_URL + "/api/authorized-users", {
      method: "POST",
      body: JSON.stringify(dataToSend),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });
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

        const response = await fetch(NEXT_PUBLIC_STRAPI_API_URL + "/api/authorized-users", {
          method: "POST",
          body: JSON.stringify(dataToSend),
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
          },
        });
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

export async function updateOnboardingInfo(
  first: string | null,
  last: string | null,
  bio: string | null,
  userId: number,
) {
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            firstName: first,
            lastName: last,
            bio: bio,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update first time status");
    }
    return { success: true };
  } catch (error) {
    console.error("Error updating first time status:", error);
    return { success: false, error };
  }
}

export async function updateUserInfo(
  first: string | null,
  last: string | null,
  bio: string | null,
  roles: AuthorizedUserRoleTitle[],
  profilePhoto: string | null,
  userId: number,
) {
  try {
    const roleIds = await Promise.all(
      roles.map((role) => getAuthorizedUserRoleIdByTitle(role)),
    );

    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            firstName: first,
            lastName: last,
            bio: bio,
            profilePhoto: profilePhoto,
            roles: {
              set: roleIds.map((id) => ({ id })),
            },
          },
        }),
      },
    );
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Error updating user info:", error);
    return { success: false, error };
  }
}

export async function updateFirstTimeStatus(userId: number) {
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            firstTime: false,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update first time status");
    }
    return { success: true };
  } catch (error) {
    console.error("Error updating first time status:", error);
    return { success: false, error };
  }
}

export async function updateLinkedin(data: string, userId: number) {
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            linkedin: data,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update linkedin");
    }
    return { success: true };
  } catch (error) {
    console.error("Error updating linkedin:", error);
    return { success: false, error };
  }
}

export async function updateGithub(data: string, userId: number) {
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            github: data,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update github");
    }
    return { success: true };
  } catch (error) {
    console.error("Error updating github:", error);
    return { success: false, error };
  }
}

export async function updatePhoto(imageUrl: string, userId: number) {
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            profilePhoto: imageUrl,
          },
        }),
      },
    );

    if (!response.ok) {
      console.error("Profile update failed:", await response.text());
      return { success: false, error: "Failed to update profile photo" };
    }

    revalidatePath("/settings/profile");
    return { success: true };
  } catch (error) {
    console.error("Error updating photo:", error);
    return { success: false, error: "Failed to process request" };
  }
}

export async function updateAuthorBio(bio: string, userId: number) {
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            bio: bio,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update bio");
    }
    return { success: true };
  } catch (error) {
    console.error("Error updating bio:", error);
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

const UpdateAuthorizedUser = AuthorizedUserSchema.omit({ email: true });
export async function updateAuthorizedUser(formData: FormData) {
  const { id, isEnabled } = UpdateAuthorizedUser.parse({
    id: formData.get("id"),
    isEnabled: formData.get("isEnabled") === "true",
  });

  const dataToSend = {
    data: {
      isEnabled,
    },
  };

  try {
    const response = await fetch(
      NEXT_PUBLIC_STRAPI_API_URL + "/api/authorized-users/" + id,
      {
        method: "PUT",
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
    return { error: "Database Error: Failed to Update Authorized User." };
  }
  revalidatePath("/admin");
}
