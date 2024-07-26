"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "./auth/session";
import { getAuthorByAuthorizedUserEmail } from "./requests/author";
import { getAuthorizedUserByEmail } from "./requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "./requests/enrollment";
import { accessRequestSchema } from "./validations/access-request";
import { BioFormSchema } from "./validations/author";
import { AuthorizedUserSchema } from "./validations/authorized-user";
import { DropletEnrollmentSchema } from "./validations/enrollment";
import { reportSchema } from "./validations/report";

const STRAPI_API_URL = process.env.STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

const CreateAuthorizedUser = AuthorizedUserSchema.omit({ id: true });
export async function createAuthorizedUser(prevState: any, formData: FormData) {
  const { email, isEnabled, isAdmin } = CreateAuthorizedUser.parse({
    email: formData.get("email"),
    isEnabled: formData.get("isEnabled"),
    isAdmin: formData.get("isAdmin"),
  });

  const dataToSend = {
    data: {
      email,
      isEnabled,
      isAdmin,
    },
  };

  try {
    const response = await fetch(STRAPI_API_URL + "/api/authorized-users", {
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

const UpdateAuthorizedUser = AuthorizedUserSchema.omit({ email: true });
export async function updateAuthorizedUser(formData: FormData) {
  const { id, isEnabled, isAdmin } = UpdateAuthorizedUser.parse({
    id: formData.get("id"),
    isEnabled: formData.get("isEnabled") === "true",
    isAdmin: formData.get("isAdmin") === "true",
  });

  const dataToSend = {
    data: {
      isEnabled,
      isAdmin,
    },
  };

  try {
    const response = await fetch(
      STRAPI_API_URL + "/api/authorized-users/" + id,
      {
        method: "PUT",
        body: JSON.stringify(dataToSend),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      }
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

const DeleteAuthorizedUser = AuthorizedUserSchema.omit({
  email: true,
  isEnabled: true,
  isAdmin: true,
});
export async function deleteAuthorizedUser(formData: FormData) {
  const { id } = DeleteAuthorizedUser.parse({
    id: formData.get("id"),
  });

  try {
    const response = await fetch(
      STRAPI_API_URL + "/api/authorized-users/" + id,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      }
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

export async function createAccessRequest(
  formData: z.infer<typeof accessRequestSchema>
) {
  try {
    const response = await fetch(STRAPI_API_URL + "/api/access-requests", {
      method: "POST",
      body: JSON.stringify({ data: formData }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });
    const data = await response.json();

    if (!response.ok || (response.ok && data.error)) {
      const errorPath = data.error.details.errors[0].path[0];
      const errorMessage = `${data.error.message} (${errorPath})`;
      return { ok: false, error: errorMessage, data: null };
    }
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to create access request." };
  }

  redirect("/");
}

const DeleteAccessRequest = z.object({ id: z.string() });
export async function deleteAccessRequest(formData: FormData) {
  const { id } = DeleteAccessRequest.parse({
    id: formData.get("id"),
  });

  try {
    const response = await fetch(
      STRAPI_API_URL + "/api/access-requests/" + id,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      }
    );
    const data = await response.json();
    if (!response.ok || (response.ok && data.error))
      return { ok: false, error: data.error.message, data: null };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to delete access request." };
  }

  revalidatePath("/admin");
}

export async function createBugReport(formData: z.infer<typeof reportSchema>) {
  try {
    const response = await fetch(STRAPI_API_URL + "/api/reports", {
      method: "POST",
      body: JSON.stringify({ data: { ...formData, type: "bug" } }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });
    const data = await response.json();

    if (!response.ok || (response.ok && data.error)) {
      const errorPath = data.error.details.errors[0].path[0];
      const errorMessage = `${data.error.message} (${errorPath})`;
      return { ok: false, error: errorMessage, data: null };
    }
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to create bug report." };
  }

  redirect(formData.path + "?ts=" + Date.now());
}

export async function updateAuthorBio(formData: z.infer<typeof BioFormSchema>) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) throw new Error("No email identified");
    const author = await getAuthorByAuthorizedUserEmail(user.email);

    const response = await fetch(STRAPI_API_URL + "/api/authors/" + author.id, {
      method: "PUT",
      body: JSON.stringify({ data: { bio: formData.bio } }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });
    const data = await response.json();

    if (!response.ok || (response.ok && data.error)) {
      const errorPath = data.error.details.errors[0].path[0];
      const errorMessage = `${data.error.message} (${errorPath})`;
      return { ok: false, error: errorMessage, data: null };
    }
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to update author." };
  }

  revalidatePath("/(general)/settings/profile", "page");
  revalidatePath("/(droplets)/d/[slug]", "page");
  revalidatePath("/(droplets)/d/[slug]/recap", "page");
  redirect("/settings/profile");
}

export async function createEnrollment(
  formData: z.infer<typeof DropletEnrollmentSchema>
) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) throw new Error("No email identified");
    const authorizedUser = await getAuthorizedUserByEmail(user.email);
    const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);

    if (
      !enrollments
        .map((enrollment) => enrollment.droplet.id)
        .includes(formData.droplet)
    ) {
      const response = await fetch(STRAPI_API_URL + "/api/enrollments", {
        method: "POST",
        body: JSON.stringify({
          data: { ...formData, authorizedUser: authorizedUser.id },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      });
      const data = await response.json();

      if (!response.ok || (response.ok && data.error)) {
        const errorPath = data.error.details.errors[0].path[0];
        const errorMessage = `${data.error.message} (${errorPath})`;
        return { ok: false, error: errorMessage, data: null };
      }

      revalidateTag("enrollments");
      revalidatePath("/(general)/dashboard", "page");
    }
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to enroll." };
  }
}
