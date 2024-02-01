"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const STRAPI_API_URL = process.env.STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

const AuthorizedUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  isEnabled: z.coerce.boolean(),
  isAdmin: z.coerce.boolean(),
});

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
    if (!response.ok)
      return { ok: false, error: data.error.message, data: null };
    if (response.ok && data.error)
      return { ok: false, error: data.error.message, data: null };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Update Authorized User." };
  }

  revalidatePath("/admin");
  return { message: `User ${email} created!`, success: true };
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
    if (!response.ok)
      return { ok: false, error: data.error.message, data: null };
    if (response.ok && data.error)
      return { ok: false, error: data.error.message, data: null };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Update Authorized User." };
  }
  revalidatePath("/admin");
  redirect("/admin");
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
    if (!response.ok)
      return { ok: false, error: data.error.message, data: null };
    if (response.ok && data.error)
      return { ok: false, error: data.error.message, data: null };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Delete Authorized User." };
  }

  revalidatePath("/admin");
  redirect("/admin");
}
