"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { accessRequestSchema } from "./validations/access-request";
import { reportSchema } from "./validations/report";
import type { CreationRequest, TimeZone } from "@/types";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "node:buffer";
import { createAuthorizedUser } from "./requests/authorized-user";
import { creationRequestSchema } from "./validations/creation-request";
import qs from "qs";
import { flattenAttributes } from "@/lib/utils";

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
    return { error: "Failed to delete report" };
  }

  revalidatePath("/admin?adminTab=Reports");
  return { success: true };
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

/**
 * Creates a new creation request
 */
export async function createCreationRequest(
  formData: z.infer<typeof creationRequestSchema>,
) {
  try {
    const response = await fetch(STRAPI_API_URL + "/api/creation-requests", {
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
    
    return { ok: true, data, error: null };
  } catch (err) {
    console.error(err);
    return { 
      ok: false, 
      error: "Database Error: Failed to create creation request.",
      data: null 
    };
  }
}

/**
 * Approves a creation request and grants Content Creator role to the user
 */
export async function approveCreationRequest(requestId: string, userId: number) {
  try {
    // First, get the current user to append the new role
    const userResponse = await fetch(
      `${STRAPI_API_URL}/api/authorized-users/${userId}?populate=roles`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
      }
    );
    
    if (!userResponse.ok) {
      return { 
        ok: false, 
        error: "Failed to fetch user data",
        data: null 
      };
    }
    
    const userData = await userResponse.json();
    const currentRoles = userData.data.attributes.roles || [];
    
    // Add Content Creator role if not already present
    if (!currentRoles.includes("Content Creator")) {
      const updateResponse = await fetch(
        `${STRAPI_API_URL}/api/authorized-users/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            data: {
              roles: [...currentRoles, "Content Creator"],
            },
          }),
        }
      );
      
      if (!updateResponse.ok) {
        return { 
          ok: false, 
          error: "Failed to update user roles",
          data: null 
        };
      }
    }
    
    // Delete the creation request after approval
    const deleteResponse = await fetch(
      `${STRAPI_API_URL}/api/creation-requests/${requestId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
      }
    );
    
    if (!deleteResponse.ok) {
      return { 
        ok: false, 
        error: "Failed to delete creation request",
        data: null 
      };
    }
    
    revalidatePath("/admin");
    return { ok: true, error: null, data: null };
  } catch (err) {
    console.error(err);
    return { 
      ok: false, 
      error: "Database Error: Failed to approve creation request.",
      data: null 
    };
  }
}

/**
 * Deletes a creation request
 */
export async function deleteCreationRequest(requestId: string) {
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/creation-requests/${requestId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
      }
    );
    
    if (!response.ok) {
      return { 
        ok: false, 
        error: "Failed to delete creation request",
        data: null 
      };
    }
    
    revalidatePath("/admin");
    return { ok: true, error: null, data: null };
  } catch (err) {
    console.error(err);
    return { 
      ok: false, 
      error: "Database Error: Failed to delete creation request.",
      data: null 
    };
  }
}

/**
 * Fetches all creation requests with user information
 */
export async function fetchCreationRequests(): Promise<CreationRequest[]> {
  try {
    let page = 1;
    const pageSize = 250;
    let allCreationRequests: CreationRequest[] = [];
    
    while (true) {
      const query = qs.stringify({
        populate: ["authorized_user"],
        pagination: {
          pageSize,
          page,
        },
      });
      
      console.log("Fetching URL:", `${STRAPI_API_URL}/api/creation-requests?${query}`);
      
      const response = await fetch(
        `${STRAPI_API_URL}/api/creation-requests?${query}`,
        {
          headers: { 
            Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}` 
          },
          cache: "no-store",
        }
      );
      
      console.log("Response status:", response.status);
      
      const data = await response.json();
      console.log("Raw data:", JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        console.error("Failed to fetch creation requests", data);
        break;
      }
      
      const creationRequests = flattenAttributes(data.data);
      console.log("After flattenAttributes:", creationRequests);
      
      allCreationRequests = allCreationRequests.concat(creationRequests);
      
      if (creationRequests.length < pageSize) break;
      page++;
    }
    
    console.log("Final result:", allCreationRequests);
    return allCreationRequests;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch creation requests data.");
  }
}

/**
 * Fetches a single creation request by ID with user information
 */
export async function fetchCreationRequestById(requestId: string) {
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/creation-requests/${requestId}?populate=user`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return {
        ok: false,
        error: "Failed to fetch creation request",
        data: null,
      };
    }

    const data = await response.json();
    return { ok: true, error: null, data: data.data };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to fetch creation request.",
      data: null,
    };
  }
}