"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { accessRequestSchema } from "./validations/access-request";
import { reportSchema } from "./validations/report";
import type { TimeZone } from "@/types";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "node:buffer";
import { createAuthorizedUser } from "./requests/authorized-user";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
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
      Key: `${rootPath}/${fileName}`,
      Body: buffer,
      ContentType: file.type,
    };

    const response = await s3.send(new PutObjectCommand(uploadParams));
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

export async function createAuthorizedUserWithState(
  _prevState: any,
  formData: FormData,
) {
  return createAuthorizedUser(formData);
}

export async function deleteImage(fileName: string) {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    const rootPath = process.env.AWS_S3_BUCKET_ROOT!;

    const uploadParams = {
      Bucket: bucketName,
      Key: `${rootPath}/${fileName}`,
    };

    const response = await s3.send(new DeleteObjectCommand(uploadParams));

    if (response["$metadata"].httpStatusCode != 204) {
      return { ok: false, error: "Failed to delete image" };
    }
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: "Failed to delete image" };
  }
}

export async function setTimeZone(zone: string, userId: number) {
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
            timeZone: zone as TimeZone,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update timezone");
    }
    return { success: true };
  } catch (error) {
    console.error("Error updating timezone:", error);
    return { success: false, error };
  }
}

export async function deleteReport(id: string) {
  const response = await fetch(`${STRAPI_API_URL}/api/reports/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete report");
  }
  redirect("/admin?ts=" + Date.now() + "&adminTab=Reports");
  return response.json();
}

export async function createBugReport(formData: z.infer<typeof reportSchema>) {
  try {
    const response = await fetch(STRAPI_API_URL + "/api/reports", {
      method: "POST",
      body: JSON.stringify({
        data: { ...formData, type: "bug", time: new Date().toISOString() },
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
    return { ok: true, data };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to create bug report." };
  }
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
