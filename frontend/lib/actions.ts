"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { accessRequestSchema } from "./validations/access-request";
import { AuthorizedUserSchema } from "./validations/authorized-user";
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
