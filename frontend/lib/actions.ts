"use server";

import { COLLEGES } from "@/app/globals";
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
    return { error: "Database Error: Failed to Create Authorized User." };
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

// -----

const AFFILIATIONS = [
  { value: "student", label: "Student" },
  { value: "faculty", label: "Faculty" },
  { value: "staff", label: "Staff" },
  { value: "other", label: "Other" },
];
const PERMITTED_DOMAINS = ["northeastern.edu", "neu.edu"];

type AffiliationValues = (typeof AFFILIATIONS)[number]["value"];
const AFFILIATION_VALUES: [AffiliationValues, ...AffiliationValues[]] = [
  AFFILIATIONS[0].value,
  // And then merge in the remaining values from `properties`
  ...AFFILIATIONS.slice(1).map((p) => p.value),
];

type CollegeValues = (typeof COLLEGES)[number]["value"];
const COLLEGE_VALUES: [CollegeValues, ...CollegeValues[]] = [
  COLLEGES[0].value,
  // And then merge in the remaining values from `properties`
  ...COLLEGES.slice(1).map((p) => p.value),
];

const CreateAccessRequest = z
  .object({
    givenName: z.string().min(2).max(50),
    familyName: z.string().min(2).max(50),
    email: z.string().email(),
    affiliation: z.enum(AFFILIATION_VALUES),
    college: z.enum(COLLEGE_VALUES),
  })
  .refine(
    (data) => {
      const domain = data.email.split("@")[1];
      return PERMITTED_DOMAINS.includes(domain);
    },
    {
      message: `Email must be @${PERMITTED_DOMAINS.join(" or @")}`,
      path: ["email"],
    }
  );
export async function createAccessRequest(
  formData: z.infer<typeof CreateAccessRequest>
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
    return { error: "Database Error: Failed to Create Access Request." };
  }

  revalidatePath("/request-access");
  redirect("/");
}
