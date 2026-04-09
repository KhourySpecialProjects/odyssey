"use server";

import { VoyageEnrollment, VoyageNode, VoyageNodeCompletion } from "@/types";
import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "../cache-tags";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "./cached";

const STRAPI_API_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337";
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * Fetches a single voyage enrollment for a specific user and voyage.
 * Returns null if no enrollment exists.
 */
export async function getVoyageEnrollment(
  authorizedUserId: number,
  voyageId: number,
): Promise<VoyageEnrollment | null> {
  const enrollments = await fetchAPI<VoyageEnrollment[]>(
    "/voyage-enrollments",
    {
      urlParams: {
        filters: {
          $and: [
            { authorizedUser: { id: { $eq: authorizedUserId } } },
            { voyage: { id: { $eq: voyageId } } },
          ],
        },
        fields: ["id", "enrolledAt", "completionPercentage"],
        pagination: { pageSize: 1, page: 1 },
      },
      next: {
        tags: [
          CACHE_TAGS.voyageEnrollments(authorizedUserId),
          CACHE_TAGS.allVoyageEnrollments,
        ],
        revalidate: 900,
      },
    },
  );

  return enrollments[0] || null;
}

/**
 * Fetches all voyage enrollments for a user, with voyage populated for dashboard display.
 */
export async function getVoyageEnrollmentsByUser(
  authorizedUserId: number,
): Promise<VoyageEnrollment[]> {
  return await fetchAPI<VoyageEnrollment[]>("/voyage-enrollments", {
    urlParams: {
      filters: {
        authorizedUser: { id: { $eq: authorizedUserId } },
      },
      fields: ["id", "enrolledAt", "completionPercentage"],
      populate: {
        voyage: {
          fields: ["id", "name", "slug"],
          populate: {
            voyage_playlists: {
              populate: {
                playlist: {
                  fields: ["id"],
                  populate: { droplets: { fields: ["id"] } },
                },
              },
            },
          },
        },
      },
      pagination: { pageSize: 250, page: 1 },
    },
    next: {
      tags: [
        CACHE_TAGS.voyageEnrollments(authorizedUserId),
        CACHE_TAGS.allVoyageEnrollments,
      ],
      revalidate: 900,
    },
  });
}

/**
 * Enrolls the current user in a voyage.
 * Idempotent: if already enrolled, returns the existing enrollment.
 */
export async function enrollInVoyage(voyageId: number) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return { ok: false, error: "User not authenticated", data: null };
    }

    const authorizedUser = await getCachedUser(user.email);
    if (!authorizedUser?.id) {
      return { ok: false, error: "Authorized user not found", data: null };
    }

    const existing = await getVoyageEnrollment(authorizedUser.id, voyageId);
    if (existing) {
      return { ok: true, error: null, data: existing };
    }

    const response = await fetch(`${STRAPI_API_URL}/api/voyage-enrollments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          authorizedUser: authorizedUser.id,
          voyage: voyageId,
          enrolledAt: new Date().toISOString(),
        },
      }),
    });

    const responseData = await response.json();

    if (!response.ok || (response.ok && responseData.error)) {
      return {
        ok: false,
        error: responseData.error?.message || "Failed to enroll in voyage",
        data: null,
      };
    }

    revalidateTag(CACHE_TAGS.voyageEnrollments(authorizedUser.id));
    revalidateTag(CACHE_TAGS.allVoyageEnrollments);
    revalidateTag(CACHE_TAGS.voyages);

    return {
      ok: true,
      error: null,
      data: flattenAttributes(responseData.data),
    };
  } catch (err) {
    console.error("Error in enrollInVoyage:", err);
    return {
      ok: false,
      error: "Database Error: Failed to enroll in voyage.",
      data: null,
    };
  }
}

/**
 * Unenrolls the current user from a voyage.
 * No-op if the user is not enrolled.
 */
export async function unenrollFromVoyage(voyageId: number) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return { ok: false, error: "User not authenticated", data: null };
    }

    const authorizedUser = await getCachedUser(user.email);
    if (!authorizedUser?.id) {
      return { ok: false, error: "Authorized user not found", data: null };
    }

    const enrollment = await getVoyageEnrollment(authorizedUser.id, voyageId);
    if (!enrollment) {
      return { ok: true, error: null, data: null };
    }

    // Delete associated voyage-node-completion records first (no cascade in Strapi v4)
    const completions = await fetchAPI<VoyageNodeCompletion[]>(
      "/voyage-node-completions",
      {
        urlParams: {
          filters: {
            $and: [
              { authorizedUser: { id: { $eq: authorizedUser.id } } },
              { voyageEnrollment: { id: { $eq: enrollment.id } } },
            ],
          },
          fields: ["id"],
          pagination: { pageSize: 250, page: 1 },
        },
        next: { revalidate: 0 },
      },
    );

    await Promise.all(
      completions.map((completion) =>
        fetch(
          `${STRAPI_API_URL}/api/voyage-node-completions/${completion.id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
            },
          },
        ),
      ),
    );

    const response = await fetch(
      `${STRAPI_API_URL}/api/voyage-enrollments/${enrollment.id}`,
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
        error: "Failed to unenroll from voyage.",
        data: null,
      };
    }

    const data = await response.json();

    revalidateTag(CACHE_TAGS.voyageEnrollments(authorizedUser.id));
    revalidateTag(CACHE_TAGS.allVoyageEnrollments);
    revalidateTag(CACHE_TAGS.voyages);

    return { ok: true, error: null, data: flattenAttributes(data.data) };
  } catch (err) {
    console.error("Error in unenrollFromVoyage:", err);
    return {
      ok: false,
      error: "Database Error: Failed to unenroll from voyage.",
      data: null,
    };
  }
}

/**
 * Fetches all voyage node completions for a specific user and voyage.
 */
export async function getVoyageNodeCompletions(
  authorizedUserId: number,
  voyageId: number,
): Promise<VoyageNodeCompletion[]> {
  return await fetchAPI<VoyageNodeCompletion[]>("/voyage-node-completions", {
    urlParams: {
      filters: {
        $and: [
          { authorizedUser: { id: { $eq: authorizedUserId } } },
          { voyageEnrollment: { voyage: { id: { $eq: voyageId } } } },
        ],
      },
      populate: {
        voyageNode: {
          fields: ["id"],
        },
      },
      pagination: { pageSize: 250, page: 1 },
    },
    next: {
      tags: [CACHE_TAGS.voyageEnrollments(authorizedUserId)],
      revalidate: 900,
    },
  });
}

/**
 * Marks a voyage node as complete for the current user.
 * Creates a voyage-node-completion record, then recalculates and updates
 * the completionPercentage on the voyage-enrollment.
 */
export async function markVoyageNodeComplete(
  voyageNodeId: number,
  voyageEnrollmentId: number,
) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return { ok: false, error: "User not authenticated", data: null };
    }

    const authorizedUser = await getCachedUser(user.email);
    if (!authorizedUser?.id) {
      return { ok: false, error: "Authorized user not found", data: null };
    }

    // Verify the enrollment belongs to the calling user and the node belongs to the same voyage
    const enrollmentCheck = await fetchAPI<VoyageEnrollment[]>(
      "/voyage-enrollments",
      {
        urlParams: {
          filters: {
            $and: [
              { id: { $eq: voyageEnrollmentId } },
              { authorizedUser: { id: { $eq: authorizedUser.id } } },
              { voyage: { voyage_nodes: { id: { $eq: voyageNodeId } } } },
            ],
          },
          fields: ["id"],
          pagination: { pageSize: 1, page: 1 },
        },
        next: { revalidate: 0 },
      },
    );

    if (enrollmentCheck.length === 0) {
      return {
        ok: false,
        error: "Enrollment not found or unauthorized",
        data: null,
      };
    }

    // Check for existing completion (idempotent — prevent duplicates from race conditions)
    const existing = await fetchAPI<VoyageNodeCompletion[]>(
      "/voyage-node-completions",
      {
        urlParams: {
          filters: {
            $and: [
              { authorizedUser: { id: { $eq: authorizedUser.id } } },
              { voyageNode: { id: { $eq: voyageNodeId } } },
            ],
          },
          fields: ["id"],
          pagination: { pageSize: 1, page: 1 },
        },
        next: { revalidate: 0 },
      },
    );

    if (existing.length > 0) {
      return { ok: true, error: null, data: existing[0] };
    }

    // Create the voyage-node-completion record
    const completionResponse = await fetch(
      `${STRAPI_API_URL}/api/voyage-node-completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            voyageNode: voyageNodeId,
            voyageEnrollment: voyageEnrollmentId,
            authorizedUser: authorizedUser.id,
            completedAt: new Date().toISOString(),
          },
        }),
      },
    );

    const completionData = await completionResponse.json();

    if (!completionResponse.ok || completionData.error) {
      return {
        ok: false,
        error:
          completionData.error?.message || "Failed to mark node as complete",
        data: null,
      };
    }

    // Recalculate completionPercentage:
    // 1. Fetch the enrollment to get the voyage id
    const enrollments = await fetchAPI<VoyageEnrollment[]>(
      "/voyage-enrollments",
      {
        urlParams: {
          filters: { id: { $eq: voyageEnrollmentId } },
          fields: ["id", "completionPercentage"],
          populate: { voyage: { fields: ["id"] } },
          pagination: { pageSize: 1, page: 1 },
        },
        next: {
          tags: [CACHE_TAGS.voyageEnrollments(authorizedUser.id)],
          revalidate: 900,
        },
      },
    );

    const enrollment = enrollments[0];
    if (enrollment?.voyage?.id) {
      const voyageId = enrollment.voyage.id;

      // 2. Fetch all voyage nodes for this voyage
      const allNodes = await fetchAPI<VoyageNode[]>("/voyage-nodes", {
        urlParams: {
          filters: { voyage: { id: { $eq: voyageId } } },
          fields: ["id", "branchType"],
          pagination: { pageSize: 250, page: 1 },
        },
        next: {
          tags: [CACHE_TAGS.voyageEnrollments(authorizedUser.id)],
          revalidate: 900,
        },
      });

      // 3. Fetch all completions for this user and voyage (includes newly created)
      const completions = await fetchAPI<VoyageNodeCompletion[]>(
        "/voyage-node-completions",
        {
          urlParams: {
            filters: {
              $and: [
                { authorizedUser: { id: { $eq: authorizedUser.id } } },
                { voyageEnrollment: { voyage: { id: { $eq: voyageId } } } },
              ],
            },
            populate: { voyageNode: { fields: ["id"] } },
            pagination: { pageSize: 250, page: 1 },
          },
          next: {
            tags: [CACHE_TAGS.voyageEnrollments(authorizedUser.id)],
            revalidate: 900,
          },
        },
      );

      // 4. Count required nodes and completed required nodes
      const completedNodeIds = new Set(
        completions
          .map((c) => c.voyageNode?.id)
          .filter((id): id is number => id !== undefined),
      );
      const { computeCompletionPercentage } = await import(
        "@/lib/voyage-progress"
      );
      const newPercentage = Math.round(
        computeCompletionPercentage(allNodes, completedNodeIds),
      );

      // 5. PUT updated percentage on voyage-enrollment
      const putResponse = await fetch(
        `${STRAPI_API_URL}/api/voyage-enrollments/${voyageEnrollmentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            data: { completionPercentage: newPercentage },
          }),
        },
      );

      if (!putResponse.ok) {
        console.error(
          "Failed to update voyage enrollment percentage:",
          await putResponse.text().catch(() => "unknown"),
        );
        revalidateTag(CACHE_TAGS.voyageEnrollments(authorizedUser.id));
        revalidateTag(CACHE_TAGS.allVoyageEnrollments);
        return {
          ok: false,
          error:
            "Node marked complete but failed to update progress percentage.",
          data: flattenAttributes(completionData.data),
        };
      }
    }

    revalidateTag(CACHE_TAGS.voyageEnrollments(authorizedUser.id));
    revalidateTag(CACHE_TAGS.allVoyageEnrollments);

    return {
      ok: true,
      error: null,
      data: flattenAttributes(completionData.data),
    };
  } catch (err) {
    console.error("Error in markVoyageNodeComplete:", err);
    return {
      ok: false,
      error: "Database Error: Failed to mark voyage node as complete.",
      data: null,
    };
  }
}

/**
 * Called when a playlist is fully completed.
 * Checks if this playlist belongs to a voyage node for a voyage the user is enrolled in.
 * If so, marks that node as complete (if not already done).
 * Errors are swallowed so they don't break the caller.
 */
export async function checkAndCompleteVoyageNode(
  dropletId: number,
  userId: number,
): Promise<void> {
  try {
    // 0. Find playlists that contain this droplet
    const playlists = await fetchAPI<{ id: number }[]>("/playlists", {
      urlParams: {
        filters: { droplets: { id: { $eq: dropletId } } },
        fields: ["id"],
        pagination: { pageSize: 50, page: 1 },
      },
      next: { tags: [CACHE_TAGS.voyages], revalidate: 900 },
    });

    if (playlists.length === 0) return;

    // Check each playlist for voyage node connections
    for (const playlist of playlists) {
      await checkPlaylistVoyageNode(playlist.id, userId);
    }
  } catch {
    // Errors must never surface to the caller
  }
}

async function checkPlaylistVoyageNode(
  playlistId: number,
  userId: number,
): Promise<void> {
  try {
    // 1. Find voyage nodes that reference this playlist
    const voyageNodes = await fetchAPI<VoyageNode[]>("/voyage-nodes", {
      urlParams: {
        filters: { playlist: { id: { $eq: playlistId } } },
        fields: ["id"],
        populate: { voyage: { fields: ["id"] } },
        pagination: { pageSize: 50, page: 1 },
      },
      next: {
        tags: [CACHE_TAGS.voyageEnrollments(userId)],
        revalidate: 900,
      },
    });

    if (voyageNodes.length === 0) return;

    // 2. Verify ALL droplets in this playlist are complete for the user
    const playlistDroplets = await fetchAPI<{ id: number }[]>("/playlists", {
      urlParams: {
        filters: { id: { $eq: playlistId } },
        fields: ["id"],
        populate: { droplets: { fields: ["id"] } },
        pagination: { pageSize: 1, page: 1 },
      },
      next: { tags: [CACHE_TAGS.voyages], revalidate: 900 },
    });

    const dropletIds: number[] =
      (playlistDroplets[0] as any)?.droplets?.map(
        (d: { id: number }) => d.id,
      ) ?? [];

    if (dropletIds.length === 0) return;

    // Check user has isComplete enrollment for every droplet
    const completedEnrollments = await fetchAPI<{ id: number }[]>(
      "/enrollments",
      {
        urlParams: {
          filters: {
            $and: [
              { authorizedUser: { id: { $eq: userId } } },
              { droplet: { id: { $in: dropletIds } } },
              { isComplete: { $eq: true } },
            ],
          },
          fields: ["id"],
          pagination: { pageSize: dropletIds.length, page: 1 },
        },
        next: { revalidate: 0 },
      },
    );

    if (completedEnrollments.length < dropletIds.length) return;

    for (const node of voyageNodes) {
      const voyageId = node.voyage?.id;
      if (!voyageId) continue;

      // 3. Check if user has a voyage enrollment for this voyage
      const enrollments = await fetchAPI<VoyageEnrollment[]>(
        "/voyage-enrollments",
        {
          urlParams: {
            filters: {
              $and: [
                { authorizedUser: { id: { $eq: userId } } },
                { voyage: { id: { $eq: voyageId } } },
              ],
            },
            fields: ["id"],
            pagination: { pageSize: 1, page: 1 },
          },
          next: {
            tags: [CACHE_TAGS.voyageEnrollments(userId)],
            revalidate: 900,
          },
        },
      );

      const enrollment = enrollments[0];
      if (!enrollment) continue;

      // 4. Check if this node is already completed
      const existingCompletions = await fetchAPI<VoyageNodeCompletion[]>(
        "/voyage-node-completions",
        {
          urlParams: {
            filters: {
              $and: [
                { authorizedUser: { id: { $eq: userId } } },
                { voyageNode: { id: { $eq: node.id } } },
              ],
            },
            fields: ["id"],
            pagination: { pageSize: 1, page: 1 },
          },
          next: {
            tags: [CACHE_TAGS.voyageEnrollments(userId)],
            revalidate: 900,
          },
        },
      );

      if (existingCompletions.length > 0) continue;

      // 5. Mark the node as complete
      await markVoyageNodeComplete(node.id, enrollment.id);
    }
  } catch (err) {
    console.error("Error in checkPlaylistVoyageNode:", err);
    // Swallow error so playlist completion is not broken
  }
}
