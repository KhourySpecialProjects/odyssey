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
import { AuthorizedUserRole } from "@/types";
import { AuthorizedUserRoleTitle } from "./globals";
import { getAuthorizedUserRoleIdByTitle } from "./requests/authorized-user-roles";
import { DropletSchema } from "./validations/droplet";
import { LessonSchema } from "./validations/lesson";

const STRAPI_API_URL = process.env.STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

const CreateAuthorizedUser = AuthorizedUserSchema.omit({
  id: true,
  roles: true,
});
export async function createAuthorizedUser(prevState: any, formData: FormData) {
  const roleID = await getAuthorizedUserRoleIdByTitle(
    AuthorizedUserRoleTitle.User,
  );
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
      STRAPI_API_URL + "/api/authorized-users/" + id,
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
      STRAPI_API_URL + "/api/authorized-users/" + id,
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

export async function createAccessRequest(
  formData: z.infer<typeof accessRequestSchema>,
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
      },
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
  formData: z.infer<typeof DropletEnrollmentSchema>,
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

const CreateDropletSchema = DropletSchema.pick({
  name: true,
  focusArea: true,
  type: true,
  tagIds: true,
  learningObjectives: true,
});
export async function createDroplet(data: z.infer<typeof CreateDropletSchema>) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) throw new Error("No email identified");
    const author = await getAuthorByAuthorizedUserEmail(user.email, {
      populate: {},
    });
    if (!author) throw new Error("No author identified");

    const dataToSend = {
      name: data.name,
      slug: "random", // this gets overwritten when created, but just has to be defined as something
      focusArea: data.focusArea,
      type: data.type,
      tags: {
        connect: data.tagIds,
      },
      authors: {
        connect: [author.id],
      },

      learningObjectives: data.learningObjectives.map((obj) => ({
        objective: obj,
      })),
    };

    const response = await fetch(STRAPI_API_URL + "/api/droplets", {
      method: "POST",
      body: JSON.stringify({ data: dataToSend }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });

    const responseData = await response.json();

    if (!response.ok || (response.ok && responseData.error)) {
      const errorPath = responseData.error.details.errors[0].path[0];
      const errorMessage = `${responseData.error.message} (${errorPath})`;
      return { ok: false, error: errorMessage, data: null };
    }
    revalidateTag("authors");
    revalidateTag("droplets");
    revalidatePath("(general)/drafts", "page");
    return { ok: true, error: null, data: responseData.data };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to create droplet.",
      data: null,
    };
  }
}

const CreateLessonSchema = LessonSchema.pick({ name: true, dropletId: true });
export async function addLesson(formData: z.infer<typeof CreateLessonSchema>) {
  try {
    const dataToSend = {
      name: formData.name,
      slug: "random", //autogenerated but must be defined
      blocks: [],
      droplets: {
        connect: [formData.dropletId],
      },
    };
    const response = await fetch(STRAPI_API_URL + "/api/lessons", {
      method: "POST",
      body: JSON.stringify({ data: dataToSend }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });
    const data = await response.json();
    console.log(data);
    if (!response.ok || (response.ok && data.error)) {
      console.log(data.error.details);
      return { ok: false, error: data.error.message, data: null };
    }
    revalidateTag("droplets");
    return { ok: true, error: null, data: data.data };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Delete Authorized User." };
  }
}

export async function updateDroplet(
  id: number,
  data: Partial<z.infer<typeof DropletSchema>>,
) {
  try {
    const dataToSend: any = {
      ...(data.name && {name: data.name}),
      ...(data.focusArea && {focusArea: data.focusArea}),
      ...(data.type && {type: data.type}),
      ...(data.tagIds && {tags: data.tagIds}),
      ...(data.learningObjectives && {
        learningObjectives: data.learningObjectives.map((obj) => ({
          objective: obj,
        })),
      }),
      ...(data.prerequisiteIds && {prerequisites: data.prerequisiteIds}),
      ...(data.postrequisiteIds && {postrequisites: data.postrequisiteIds}),
      ...(data.nextSteps && {nextSteps: data.nextSteps}),
      ...(data.description && {description: data.description}),
      ...(data.overview && {overview: data.overview}),
      ...(data.lessons && {lessons: data.lessons}),
    };

    const response = await fetch(STRAPI_API_URL + "/api/droplets/" + id, {
      method: "PUT",
      body: JSON.stringify({data: dataToSend}),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });
    const responseData = await response.json();

    if (!response.ok || (response.ok && responseData.error)) {
      console.log(responseData);
      const errorPath = responseData.error.details.errors[0].path[0];
      const errorMessage = `${responseData.error.message} (${errorPath})`;
      return {ok: false, error: errorMessage, data: null};
    }
    console.log(responseData);
    revalidateTag("droplets");
    revalidateTag("authors");
    revalidatePath("(general)/drafts", "page");
    return {ok: true, error: null, data: responseData.data};
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to update droplet.",
      data: null,
    };
  }
}

export async function updateLesson(
  id: number,
  data: Partial<z.infer<typeof LessonSchema>>,
  reload: boolean,
) {
  try {
    if (data.blocks) {
      data.blocks = data.blocks.map(({ id, ...rest }) => rest);
    }

    const dataToSend: any = {
      ...(data.name && { name: data.name }),
      ...(data.blocks && { blocks: data.blocks }),
    };

    console.log(dataToSend);

    console.log(dataToSend);

    const response = await fetch(STRAPI_API_URL + "/api/lessons/" + id, {
      method: "PUT",
      body: JSON.stringify({ data: dataToSend }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });
    const responseData = await response.json();

    if (!response.ok || (response.ok && responseData.error)) {
      console.log(responseData);
      const errorPath = responseData.error.details.errors[0].path[0];
      const errorMessage = `${responseData.error.message} (${errorPath})`;
      return { ok: false, error: errorMessage, data: null };
    }
    console.log(responseData);
    if (reload) {
      revalidateTag("lesson");
      revalidatePath("(editing)/draft/d/[slug]/[lessonSlug]", "page");
    }

    revalidatePath("(editing)/draft/d/[slug]/[lessonSlug]", "page");

    return { ok: true, error: null, data: responseData.data };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to update droplet.",
      data: null,
    };
  }
}

export async function revalidateLesson() {
  revalidateTag("lesson");
  revalidatePath("(editing)/draft/d/[slug]/[lessonSlug]", "page");
}
