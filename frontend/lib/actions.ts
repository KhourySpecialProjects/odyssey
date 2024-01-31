"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const STRAPI_URL = process.env.STRAPI_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

const AuthorizedUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  isEnabled: z.coerce.boolean(),
  isAdmin: z.coerce.boolean(),
});

const UpdateAuthorizedUser = AuthorizedUserSchema.omit({ email: true });
export async function updateAuthorizedUser(formData: FormData) {
  const { id, isEnabled, isAdmin } = UpdateAuthorizedUser.parse({
    id: formData.get("id"),
    isEnabled: formData.get("isEnabled") === "true",
    isAdmin: formData.get("isAdmin") === "true",
  });

  const dataToSend = {
    data: {
      isEnabled: isEnabled,
      isAdmin: isAdmin,
    },
  };

  try {
    const response = await fetch(STRAPI_URL + "/api/authorized-users/" + id, {
      method: "PUT",
      body: JSON.stringify(dataToSend),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });
    const data = await response.json();
    console.log(dataToSend);
    console.log(data);
    if (!response.ok)
      return { ok: false, error: data.error.message, data: null };
    if (response.ok && data.error)
      return { ok: false, error: data.error.message, data: null };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Update Authorized User." };
  }
  revalidatePath("/private");
  redirect("/private");
}
