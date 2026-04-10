"use server";

import { revalidateTag } from "next/cache";
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
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { createAuthorizedUser } from "./requests/authorized-user";
import { creationRequestSchema } from "./validations/creation-request";
import { MAX_DATASET_FILE_SIZE } from "./validations/dataset";
import qs from "qs";
import { flattenAttributes } from "@/lib/utils";
import { CACHE_TAGS } from "./cache-tags";
import Anthropic from "@anthropic-ai/sdk";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

const isLocal = process.env.NODE_ENV === "development";
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

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
    const buffer = Buffer.from(await file.arrayBuffer());

    if (isLocal) {
      await mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
      await writeFile(path.join(LOCAL_UPLOADS_DIR, fileName), buffer);
      return { ok: true, error: null, url: `/uploads/${fileName}` };
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    const rootPath = process.env.AWS_S3_BUCKET_ROOT!;

    const uploadParams = {
      Bucket: bucketName,
      Key: `${rootPath}/${fileName}`,
      Body: buffer,
      ContentType: file.type,
      CacheControl: "public, max-age=604800, immutable",
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

export async function deleteDataset(fileUrl: string) {
  try {
    // Local file deletion
    if (isLocal && fileUrl.startsWith("/uploads/")) {
      const relativePath = fileUrl.slice("/uploads/".length);
      const resolved = path.resolve(LOCAL_UPLOADS_DIR, relativePath);
      // Prevent path traversal — ensure resolved path stays inside uploads dir
      if (!resolved.startsWith(LOCAL_UPLOADS_DIR + path.sep)) {
        return { ok: false, error: "Invalid file path." };
      }
      try {
        await unlink(resolved);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") throw err;
      }
      revalidateTag(CACHE_TAGS.datasets);
      return { ok: true, error: null };
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    const bucketUrl = process.env.AWS_S3_BUCKET_URL!;
    const prefix = bucketUrl.endsWith("/") ? bucketUrl : `${bucketUrl}/`;

    if (!fileUrl.startsWith(prefix)) {
      return { ok: false, error: "Invalid file URL." };
    }

    const key = fileUrl.slice(prefix.length);

    const response = await s3.send(
      new DeleteObjectCommand({ Bucket: bucketName, Key: key }),
    );

    if (
      response["$metadata"].httpStatusCode !== 204 &&
      response["$metadata"].httpStatusCode !== 200
    ) {
      return { ok: false, error: "Failed to delete dataset." };
    }
    revalidateTag(CACHE_TAGS.datasets);
    return { ok: true, error: null };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Failed to delete dataset." };
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
    if (isLocal) {
      const resolved = path.resolve(LOCAL_UPLOADS_DIR, fileName);
      if (!resolved.startsWith(LOCAL_UPLOADS_DIR + path.sep)) {
        return { ok: false, error: "Invalid file path" };
      }
      await unlink(resolved);
      return { ok: true, error: null };
    }

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
    revalidateTag(CACHE_TAGS.users);
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

  revalidateTag(CACHE_TAGS.reports);
  return { success: true };
}

export async function createBugReport(formData: z.infer<typeof reportSchema>) {
  try {
    const { sessionUrl, ...strapiData } = formData; // sessionUrl excluded from Strapi

    const response = await fetch(STRAPI_API_URL + "/api/reports", {
      method: "POST",
      body: JSON.stringify({
        data: { ...strapiData, type: "bug", time: new Date().toISOString() },
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
    revalidateTag(CACHE_TAGS.reports);

    // Fire Linear issue creation — must not throw or block the return below
    await createLinearIssue({ ...strapiData, sessionUrl });

    return { ok: true, data };
  } catch (err) {
    console.error(err);
    return { error: "Database Error: Failed to create bug report." };
  }
}

async function createLinearIssue(
  formData: Omit<z.infer<typeof reportSchema>, "sessionUrl"> & {
    sessionUrl?: string;
  },
) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "placeholder",
    dangerouslyAllowBrowser: true,
  });

  // AI-generate the Acceptance Criteria, Steps to Reproduce, and Impact sections
  let generatedSections = "";
  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a technical project manager writing a Linear bug ticket. Based on the bug description and page below, generate the following three sections in Markdown. Output only the three sections with no preamble or explanation.

## Acceptance Criteria
- How do we know it's done?
- [ ] [write 2-3 specific, testable criteria based on the bug]

## Steps to Reproduce Bug
- [write 3-5 specific steps someone could follow to reproduce this bug based on the description]

## Impact
[One sentence describing how this bug affects users or the system]

Bug description: "${formData.description}"
Page: "${formData.path}"`,
        },
      ],
    });
    generatedSections =
      msg.content[0].type === "text" ? msg.content[0].text : "";
  } catch (err) {
    console.error(
      "Anthropic generation failed, using placeholder sections:",
      err,
    );
    generatedSections = `## Acceptance Criteria
- How do we know it's done?
- [ ] [criteria #1]
- [ ] [criteria #2]

## Steps to Reproduce Bug
- [Step #1]
- [Step #2]
- [Step #3]

## Impact
Describe how this affects users, performance, or other parts of the system.`;
  }

  const description = `
## Overview
${formData.description}

**Page:** ${formData.path}

${generatedSections}

---
## 🎥 PostHog Session Replay
${formData.sessionUrl ? `[View session at time of report](${formData.sessionUrl})` : "Session replay not available"}
  `.trim();

  const mutation = `
    mutation {
      issueCreate(input: {
        title: "[Bug] ${formData.description.slice(0, 60).replace(/"/g, '\\"')}..."
        description: ${JSON.stringify(description)}
        teamId: "${process.env.LINEAR_TEAM_ID}"
        labelIds: ["${process.env.LINEAR_BUG_LABEL_ID}"]
        priority: 1
      }) {
        success
        issue { id identifier }
      }
    }
  `;

  try {
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.LINEAR_API_KEY ?? "",
      },
      body: JSON.stringify({ query: mutation }),
    });

    const result = await res.json();

    if (!result.data?.issueCreate?.success) {
      console.error("Linear issue creation failed:", JSON.stringify(result));
    }
  } catch (err) {
    console.error("Linear API call threw an error:", err);
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

  revalidateTag(CACHE_TAGS.accessRequests);
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

  revalidateTag(CACHE_TAGS.accessRequests);
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

    revalidateTag(CACHE_TAGS.creationRequests);
    return { ok: true, data, error: null };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to create creation request.",
      data: null,
    };
  }
}

/**
 * Approves a creation request and grants Content Creator role to the user
 */
/**
 * Approves a creation request and grants Content Creator role to the user
 */
export async function approveCreationRequest(
  requestId: string,
  userId: number,
) {
  try {
    // First, get the current user with their roles
    const userResponse = await fetch(
      `${STRAPI_API_URL}/api/authorized-users/${userId}?populate=roles`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
      },
    );

    if (!userResponse.ok) {
      console.error("Failed to fetch user data");
      return {
        ok: false,
        error: "Failed to fetch user data",
        data: null,
      };
    }

    const userData = await userResponse.json();
    const currentRoles = userData.data.attributes.roles?.data || [];
    const currentRoleIds = currentRoles.map((role: any) => role.id);

    // Find the Content Creator role ID
    const rolesResponse = await fetch(
      `${STRAPI_API_URL}/api/authorized-user-roles?filters[title][$eq]=Content Creator`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
      },
    );

    if (!rolesResponse.ok) {
      console.error("Failed to fetch Content Creator role");
      return {
        ok: false,
        error: "Failed to fetch Content Creator role",
        data: null,
      };
    }

    const rolesData = await rolesResponse.json();

    if (!rolesData.data || rolesData.data.length === 0) {
      console.error("Content Creator role not found");
      return {
        ok: false,
        error: "Content Creator role not found in system",
        data: null,
      };
    }

    const contentCreatorRoleId = rolesData.data[0].id;

    // Add Content Creator role if not already present
    if (!currentRoleIds.includes(contentCreatorRoleId)) {
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
              roles: [...currentRoleIds, contentCreatorRoleId],
            },
          }),
        },
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error("Failed to update user roles:", errorData);
        return {
          ok: false,
          error: "Failed to update user roles",
          data: null,
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
      },
    );

    if (!deleteResponse.ok) {
      console.error("Failed to delete creation request");
      return {
        ok: false,
        error: "Failed to delete creation request",
        data: null,
      };
    }

    revalidateTag(CACHE_TAGS.users);
    revalidateTag(CACHE_TAGS.creationRequests);
    revalidateTag(CACHE_TAGS.authors);
    return { ok: true, error: null, data: null };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to approve creation request.",
      data: null,
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
      },
    );

    if (!response.ok) {
      return {
        ok: false,
        error: "Failed to delete creation request",
        data: null,
      };
    }

    revalidateTag(CACHE_TAGS.creationRequests);
    return { ok: true, error: null, data: null };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to delete creation request.",
      data: null,
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
        populate: {
          user: {
            fields: ["firstName", "lastName", "email", "id"],
          },
        },
        pagination: {
          pageSize,
          page,
        },
      });

      const response = await fetch(
        `${STRAPI_API_URL}/api/creation-requests?${query}`,
        {
          headers: {
            Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
          },
          next: { tags: [CACHE_TAGS.creationRequests], revalidate: 900 },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to fetch creation requests", data);
        break;
      }

      const creationRequests = flattenAttributes(data.data);

      allCreationRequests = allCreationRequests.concat(creationRequests);

      if (creationRequests.length < pageSize) break;
      page++;
    }

    return allCreationRequests;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch creation requests data.");
  }
}

const MAX_NOTEBOOK_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Saves notebook JSON content to S3.
 * Used for auto-saving .ipynb content extracted from the JupyterLite iframe.
 * If existingUrl is provided, overwrites the file at that key; otherwise creates a new object.
 * @param notebookJson - The .ipynb content as a JSON string
 * @param existingUrl - Optional S3 URL to overwrite (avoids creating new objects on every save)
 */
export async function saveNotebookContent(
  notebookJson: string,
  existingUrl?: string,
): Promise<{ ok: boolean; error: string | null; url: string | null }> {
  try {
    // Validate size before parsing (cheap check first)
    if (Buffer.byteLength(notebookJson, "utf8") > MAX_NOTEBOOK_FILE_SIZE) {
      return {
        ok: false,
        error: "Notebook size exceeds the 10MB limit.",
        url: null,
      };
    }

    // Validate JSON structure — must have "cells" array and "metadata" object
    let parsed: unknown;
    try {
      parsed = JSON.parse(notebookJson);
    } catch {
      return {
        ok: false,
        error: "Invalid notebook: content is not valid JSON.",
        url: null,
      };
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as Record<string, unknown>).cells) ||
      typeof (parsed as Record<string, unknown>).metadata !== "object"
    ) {
      return {
        ok: false,
        error:
          'Invalid notebook: must have a "cells" array and a "metadata" object.',
        url: null,
      };
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    const rootPath = process.env.AWS_S3_BUCKET_ROOT!;
    const bucketUrl = process.env.AWS_S3_BUCKET_URL!;

    let s3Key: string;
    let returnUrl: string;

    if (existingUrl) {
      // Extract S3 key from the existing URL
      // URL format: {bucketUrl}/{rootPath}/notebooks/{filename}
      const prefix = `${bucketUrl}/`;
      s3Key = existingUrl.startsWith(prefix)
        ? existingUrl.slice(prefix.length)
        : existingUrl;
      returnUrl = existingUrl;
    } else {
      const fileName = `${uuidv4()}.ipynb`;
      s3Key = `${rootPath}/notebooks/${fileName}`;
      returnUrl = `${bucketUrl}/${s3Key}`;
    }

    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: Buffer.from(notebookJson, "utf8"),
      ContentType: "application/json",
      CacheControl: "public, no-cache",
    };

    const response = await s3.send(new PutObjectCommand(uploadParams));
    if (response["$metadata"].httpStatusCode !== 200) {
      return {
        ok: false,
        error: "Failed to upload notebook to S3.",
        url: null,
      };
    }

    return { ok: true, error: null, url: returnUrl };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Failed to save notebook content.",
      url: null,
    };
  }
}

/**
 * Fetches creation request for a specific user
 * @param userId - The ID of the authorized user
 * @returns The creation request if found, null otherwise
 */
export async function fetchCreationRequestByUser(
  userId: number,
): Promise<CreationRequest | null> {
  try {
    const query = qs.stringify({
      filters: {
        user: {
          id: {
            $eq: userId,
          },
        },
      },
      populate: {
        user: {
          fields: ["firstName", "lastName", "email", "id"],
        },
      },
    });

    const response = await fetch(
      `${STRAPI_API_URL}/api/creation-requests?${query}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        next: { tags: [CACHE_TAGS.creationRequests], revalidate: 900 },
      },
    );

    if (!response.ok) {
      console.error("Failed to fetch creation request by user");
      return null;
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return null;
    }

    // Return the first (and should be only) creation request for this user
    const flattened = flattenAttributes([data.data[0]]);
    return flattened[0];
  } catch (error) {
    console.error("Database Error:", error);
    return null;
  }
}

const ALLOWED_DATASET_EXTENSIONS = new Set(["csv", "json", "xlsx"]);

export async function uploadDataset(formData: FormData) {
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return { ok: false, error: "No file provided.", url: null };
  }

  if (file.size > MAX_DATASET_FILE_SIZE) {
    return {
      ok: false,
      error: "File exceeds the 25MB maximum size limit.",
      url: null,
    };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_DATASET_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      error: "Unsupported file type. Please upload a CSV, JSON, or XLSX file.",
      url: null,
    };
  }

  try {
    const fileName = `${uuidv4()}-${encodeURIComponent(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    if (isLocal) {
      await mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
      await writeFile(path.join(LOCAL_UPLOADS_DIR, fileName), buffer);
      return { ok: true, error: null, url: `/uploads/${fileName}` };
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    const rootPath = process.env.AWS_S3_BUCKET_ROOT!;

    const response = await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: `${rootPath}/${fileName}`,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
        CacheControl: "public, max-age=604800, immutable",
      }),
    );

    if (response["$metadata"].httpStatusCode !== 200) {
      return { ok: false, error: "Failed to upload dataset.", url: null };
    }

    return {
      ok: true,
      error: null,
      url: `${process.env.AWS_S3_BUCKET_URL}/${rootPath}/${fileName}`,
    };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Failed to upload dataset.", url: null };
  }
}
