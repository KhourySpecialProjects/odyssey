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
import { AuthorizedUserRoleTitle } from "./globals";
import { getAuthorizedUserRoleIdByTitle } from "./requests/authorized-user-roles";
import { DropletSchema } from "./validations/droplet";
import { LessonSchema } from "./validations/lesson";
import type { Droplet } from "@/types";
import { getDropletById } from "./requests/droplet";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "node:buffer";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

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
    console.log("user: ", user);
    if (!user?.email) throw new Error("No email identified");
    const author = await getAuthorByAuthorizedUserEmail(user.email, {
      populate: {},
    });
    console.log("author: ", author);
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
    console.log("data to send: ", dataToSend);

    const response = await fetch(STRAPI_API_URL + "/api/droplets", {
      method: "POST",
      body: JSON.stringify({ data: dataToSend }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });
    console.log("fetch response: ", response);

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
    // First create the lesson
    const lessonData = {
      name: formData.name,
      slug: "random", //autogenerated but must be defined
      blocks: [],
      droplets: {
        connect: [formData.dropletId],
      },
    };

    const lessonResponse = await fetch(STRAPI_API_URL + "/api/lessons", {
      method: "POST",
      body: JSON.stringify({ data: lessonData }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });

    const lessonResult = await lessonResponse.json();

    if (!lessonResponse.ok || lessonResult.error) {
      return { ok: false, error: lessonResult.error?.message, data: null };
    }

    // Then create the droplet-lesson relationship
    const dropletLessonData = {
      droplet: formData.dropletId,
      lesson: lessonResult.data.id,
      orderIndex: 9999, // Will be updated by the reorder hook
    };

    const dropletLessonResponse = await fetch(
      STRAPI_API_URL + "/api/droplet-lessons",
      {
        method: "POST",
        body: JSON.stringify({ data: dropletLessonData }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
      },
    );

    const dropletLessonResult = await dropletLessonResponse.json();

    if (!dropletLessonResponse.ok || dropletLessonResult.error) {
      return {
        ok: false,
        error: dropletLessonResult.error?.message,
        data: null,
      };
    }

    revalidateTag("droplets");
    return { ok: true, error: null, data: lessonResult.data };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to create lesson." };
  }
}

export async function updateLinkedin(linkedIn: string, userId: number) {
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/authorized-users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            linkedin: linkedIn,
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

export async function updateGithub(github: string, userId: number) {
  console.log("github: ", github);
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/authorized-users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            github: github,
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

export async function updateOnboardingInfo(
  first: string | null,
  last: string | null,
  bio: string | null,
  userId: number,
) {
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/authorized-users/${userId}`,
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
  userId: number,
) {
  try {
    const roleIds = await Promise.all(
      roles.map((role) => getAuthorizedUserRoleIdByTitle(role)),
    );

    const response = await fetch(
      `${STRAPI_API_URL}/api/authorized-users/${userId}`,
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
            roles: {
              set: roleIds.map((id) => ({ id })),
            },
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

export async function updateFirstTimeStatus(userId: number) {
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/authorized-users/${userId}`,
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

export async function updateDroplet(
  id: number,
  data: Partial<z.infer<typeof DropletSchema>>,
  options: { regenerateSlug?: boolean; revalidate?: boolean } = {
    regenerateSlug: false,
    revalidate: false,
  },
) {
  try {
    const dataToSend: any = {
      ...(data.name && { name: data.name }),
      ...(data.focusArea && { focusArea: data.focusArea }),
      ...(data.type && { type: data.type }),
      ...(data.tagIds && { tags: data.tagIds }),
      ...(data.isHidden !== undefined && { isHidden: data.isHidden }),
      ...(data.learningObjectives && {
        learningObjectives: data.learningObjectives.map((obj) => ({
          objective: obj,
        })),
      }),
      ...(data.prerequisiteIds && { prerequisites: data.prerequisiteIds }),
      ...(data.postrequisiteIds && { postrequisites: data.postrequisiteIds }),
      ...(data.nextSteps && { nextSteps: data.nextSteps }),
      ...(data.description && { description: data.description }),
      ...(data.overview && { overview: data.overview }),
      ...(data.lessons && { lessons: data.lessons }),
    };

    dataToSend.regenerateSlug = options.regenerateSlug;

    // Handle updating droplet_lessons collection updates separately if they exist
    if (data.droplet_lessons) {
      console.log(" --> data.droplet_lessons = ", data.droplet_lessons);
      const dropletLessonsResponse = await Promise.all(
        data.droplet_lessons.map(async (dl) => {
          const response = await fetch(
            STRAPI_API_URL + "/api/droplet-lessons/" + dl.id,
            {
              method: "PUT",
              body: JSON.stringify({
                data: {
                  orderIndex: dl.orderIndex,
                },
              }),
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
              },
            },
          );
          return response.ok;
        }),
      );

      if (!dropletLessonsResponse.every(Boolean)) {
        return {
          ok: false,
          error: "Failed to update droplet lessons order",
          data: null,
        };
      }
    }
    // Handle updating the main droplets collection
    const response = await fetch(STRAPI_API_URL + "/api/droplets/" + id, {
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

    if (
      dataToSend.isHidden !== undefined ||
      dataToSend.name ||
      options.revalidate
    ) {
      revalidateTag("droplets");
      revalidatePath("/admin");
    }

    revalidateTag("authors");
    revalidatePath("(general)/drafts", "page");
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

export async function updateLesson(
  id: number,
  data: Partial<z.infer<typeof LessonSchema>>,
  options: { reload?: boolean; regenerateSlug?: boolean } = {
    reload: false,
    regenerateSlug: false,
  },
) {
  console.log(" --> actions.ts: updateLesson() function called");
  try {
    if (data.blocks) {
      data.blocks = data.blocks.map(({ id, ...rest }) => rest);
    }
    const dataToSend: any = {
      ...(data.name && { name: data.name }),
      ...(data.blocks && { blocks: data.blocks }),
    };
    dataToSend.regenerateSlug = options.regenerateSlug;

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
      console.log(" ----> F");
      console.log("responseData: ", responseData);
      console.log("responseData.error.details: ", responseData.error.details);
      console.log(
        "responseData.error.details.errors: ",
        responseData.error.details.errors,
      );
      console.log(
        "responseData.error.details.errors[0].path[0]: ",
        responseData.error.details.errors[0].path[0],
      );
      const errorPath = responseData.error.details.errors[0].path[0];
      const errorMessage = `${responseData.error.message} (${errorPath})`;
      return { ok: false, error: errorMessage, data: null };
    }

    if (options.reload) {
      revalidatePath("(editing)/draft/d/[slug]/[lessonSlug]", "page");
    }

    if (data.name) {
      revalidateTag("droplets");
    }

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
  console.log(" --> actions.ts: revalidateLesson() function called");
  revalidateTag("lesson");
  revalidatePath("(editing)/draft/d/[slug]/[lessonSlug]", "page");
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

        const response = await fetch(STRAPI_API_URL + "/api/authorized-users", {
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

export async function deleteLesson(id: number, revalidate: boolean = true) {
  try {
    const response = await fetch(STRAPI_API_URL + "/api/lessons/" + id, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });
    const data = await response.json();
    if (!response.ok || (response.ok && data.error))
      return { ok: false, error: data.error.message, data: null };

    if (revalidate) {
      revalidateTag("droplets");
    }

    return { ok: true, error: null, data: data.data };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Delete Authorized User." };
  }
}

export async function deepDeleteDroplet(id: number) {
  try {
    const droplet = await getDropletById<Droplet>(id, {
      fields: ["*"],
      populate: {
        authors: { populate: "*" },
        learningObjectives: { populate: "*" },
        lessons: { populate: "*" },
        tags: { populate: "*" },
        prerequisites: { populate: ["id", "name", "slug"] },
        postrequisites: { populate: ["id", "name", "slug"] },
        nextSteps: { fields: ["label", "url"] },
      },
    });

    if (droplet.lessons) {
      droplet.lessons.forEach((lesson) => {
        deleteLesson(lesson.id, false);
      });
    }

    const response = await fetch(STRAPI_API_URL + "/api/droplets/" + id, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: "Failed to delete droplet.", data: null };
    }

    revalidateTag("authors");
    revalidateTag("droplets");
    revalidatePath("(general)/drafts", "page");
    return { ok: true, error: null, data: data.data };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to Delete Droplet." };
  }
}

export async function completeLesson(activityId: number, lessonIds: number[]) {
  try {
    const response = await fetch(
      STRAPI_API_URL + `/api/authorized-user-activities/${activityId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          data: {
            lessons: lessonIds,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to complete lesson");
    }

    revalidatePath("/(droplets)/d/[slug]/[lessonSlug]");
    return { success: true };
  } catch (error) {
    console.error("Error completing lesson:", error);
    return { success: false, error };
  }
}

export async function markLessonAsComplete(
  enrollmentId: string,
  completedLessonIds: number[],
  lessonId: number,
) {
  try {
    // First get the current enrollment to ensure we have the latest data
    const enrollmentResponse = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/enrollments/${enrollmentId}?populate=viewedLessons`,
      {
        headers: {
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        },
      },
    );

    if (!enrollmentResponse.ok) {
      throw new Error("Failed to fetch enrollment");
    }

    const enrollment = await enrollmentResponse.json();

    // Update the enrollment with the new lesson
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/enrollments/${enrollmentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            viewedLessons: {
              connect: [lessonId],
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Error response:", error);
      throw new Error("Failed to mark lesson as complete");
    }

    // Update revalidation paths to be more generic
    revalidatePath("/dashboard", "layout");
    revalidatePath("/(droplets)/d/[slug]/[lessonSlug]", "layout");
    revalidatePath("/(playlists)/p/[slug]", "layout");

    /*
    return true;
  } catch (error) {
    //throw new Error(`Failed to mark lesson as complete: ${error}`);
    console.error("Error marking lesson as complete:", error);
    return false;
  }*/
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Error marking lesson as complete:", error);
    return { success: false, error };
  }

}

const s3 = new S3Client({
  region: process.env.AWS_S3_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadImage(formData: FormData) {
  if (
    !formData.get("image") ||
    formData.get("image") == undefined ||
    (formData.get("image") as File).size == 0
  ) {
    return { ok: false, error: "no image", url: null };
  }
  try {
    const file = formData.get("image") as File;
    const fileName = `${uuidv4()}-${encodeURIComponent(file.name)}`;
    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    const rootPath = process.env.AWS_S3_BUCKET_ROOT!;
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadParams = {
      Bucket: bucketName,
      Key: `${rootPath}/${fileName}`, // Upload to the specified directory
      Body: buffer,
      ContentType: file.type,
    };

    const response = await s3.send(new PutObjectCommand(uploadParams));
    console.log(fileName);
    console.log(response);
    if (response["$metadata"].httpStatusCode != 200) {
      return { ok: false, error: "Failed to upload image.", url: null };
    }
    return {
      ok: true,
      error: null,
      url: `${process.env.AWS_S3_BUCKET_URL}/${rootPath}/${fileName}`,
    };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to upload image.",
      url: null,
    };
  }
}

export async function deleteImage(fileName: string) {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    const rootPath = process.env.AWS_S3_BUCKET_ROOT!;

    const uploadParams = {
      Bucket: bucketName,
      Key: `${rootPath}/${fileName}`, // Upload to the specified directory
    };

    const response = await s3.send(new DeleteObjectCommand(uploadParams));
    console.log(response);

    if (response["$metadata"].httpStatusCode != 204) {
      return { ok: false, error: "Failed to delete image" };
    }

    console.log("Deleted Image");
    return { ok: true, error: null };
  } catch (err) {
    console.log(err);
    return { ok: false, error: "Failed to delete image" };
  }
}

export async function createPlaylist(data: {
  name: string;
  isPublic: boolean;
  droplets: { id: number }[];
  author: { id: number };
  userId: number;
}) {
  const tempSlug = "random";
  try {
    const dataToSend = {
      name: data.name,
      author: {
        set: [data.author.id],
      },
      slug: tempSlug, // this gets overwritten by Strapi
      isPublic: data.isPublic,
      droplets: {
        connect: data.droplets,
      },
      authorized_users: {
        connect: [data.userId],
      },
    };
    // console.log("data to send: ", dataToSend);

    const response = await fetch(`${STRAPI_API_URL}/api/playlists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ data: dataToSend }),
    });

    const responseData = await response.json();

    if (!response.ok || (response.ok && responseData.error)) {
      return {
        ok: false,
        error: responseData.error?.message || "Failed to create playlist",
        data: null,
      };
    }

    revalidateTag("playlists");
    return { ok: true, error: null, data: responseData.data };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to create playlist.",
      data: null,
    };
  }
}

export async function updatePlaylist(
  id: number,
  data: {
    name: string;
    isPublic: boolean;
    droplets?: { id: number }[];
    author?: { id: number };
    userId?: number;
    slug?: string; //TODO Should slug be optional for updating a playlist?
  },
) {
  try {
    const dataToSend = {
      name: data.name,
      isPublic: data.isPublic,
      droplets: {
        set: data.droplets, // 'set' replaces all existing relationships
      },
      authorized_users: {
        set: [data.userId], // ensure author remains connected
      },
      slug: data.slug,
      regenerateSlug: false,
    };

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/playlists/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ data: dataToSend }),
      },
    );

    const responseData = await response.json();

    if (!response.ok || (response.ok && responseData.error)) {
      return {
        ok: false,
        error: responseData.error?.message || "Failed to update playlist",
        data: null,
      };
    }

    revalidateTag("playlists");
    return { ok: true, error: null, data: responseData.data };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to update playlist.",
      data: null,
    };
  }
}
