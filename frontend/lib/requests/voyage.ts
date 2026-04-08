"use server";

import { Voyage } from "@/types";
import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "../cache-tags";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getCachedUser } from "./cached";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

async function requireAdminOrFaculty() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return false;
  const user = await getCachedUser(session.user.email);
  if (!user?.roles) return false;
  const titles = user.roles.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => (typeof r === "string" ? r : r.title) as string,
  );
  return (
    titles.includes(AuthorizedUserRoleTitle.SysAdmin) ||
    titles.includes(AuthorizedUserRoleTitle.Faculty)
  );
}

const NEXT_PUBLIC_STRAPI_API_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337";
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * Gets all published voyages with their voyage_playlists populated.
 * @returns The list of published Voyages.
 */
export async function getVoyages(): Promise<Voyage[]> {
  const path = `/voyages`;
  const urlParams = {
    filters: {
      status: { $eq: "published" },
    },
    populate: {
      voyage_playlists: {
        populate: {
          playlist: {
            fields: ["id", "name", "slug", "isPublic"],
            populate: {
              droplets: {
                fields: ["id"],
              },
            },
          },
        },
        sort: ["orderIndex:asc"],
      },
      voyage_nodes: {
        fields: ["id", "isMainPath", "branchType", "orderIndex", "label"],
        populate: {
          playlist: {
            fields: ["id", "slug", "name"],
            populate: { droplets: { fields: ["id"] } },
          },
          parentNode: { fields: ["id"] },
        },
      },
      authors: {
        fields: ["id", "name"],
      },
    },
    sort: ["name:asc"],
    pagination: {
      pageSize: 100,
      page: 1,
    },
  };

  return await fetchAPI<Voyage[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.voyages], revalidate: 900 },
  });
}

/**
 * Gets all voyages (draft and published) for admin use.
 * @returns The full list of Voyages regardless of status.
 */
export async function getVoyagesAdmin(): Promise<Voyage[]> {
  const path = `/voyages`;
  const urlParams = {
    publicationState: "preview",
    populate: {
      voyage_playlists: {
        populate: {
          playlist: {
            fields: ["id", "name", "slug", "isPublic"],
            populate: {
              droplets: {
                fields: ["id"],
              },
            },
          },
        },
        sort: ["orderIndex:asc"],
      },
      authors: {
        fields: ["id", "name", "email"],
      },
    },
    sort: ["name:asc"],
    pagination: {
      pageSize: 200,
      page: 1,
    },
  };

  return await fetchAPI<Voyage[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.voyages], revalidate: 0 },
  });
}

/**
 * Gets a single Voyage by its unique slug, deeply populated.
 * @param slug The unique slug of the desired Voyage.
 * @returns The Voyage, or null if not found.
 */
export async function getVoyageBySlug(slug: string): Promise<Voyage | null> {
  const path = `/voyages`;
  const urlParams = {
    filters: {
      slug: { $eq: slug },
      status: { $eq: "published" },
    },
    populate: {
      voyage_playlists: {
        populate: {
          playlist: {
            fields: ["id", "name", "slug"],
            populate: {
              droplets: {
                fields: ["id", "name", "slug"],
              },
            },
          },
        },
        sort: ["orderIndex:asc"],
      },
      voyage_nodes: {
        populate: {
          playlist: {
            fields: ["id", "name", "slug"],
            populate: {
              droplets: { fields: ["id"] },
            },
          },
          parentNode: { fields: ["id"] },
        },
        sort: ["orderIndex:asc"],
      },
      authors: {
        fields: ["id", "name"],
      },
    },
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  const voyages = await fetchAPI<Voyage[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.voyages], revalidate: 900 },
  });

  return voyages[0] || null;
}

/**
 * Creates a new Voyage. Faculty/Admin only.
 * @param data The voyage data to create.
 * @returns The created Voyage, or an error.
 */
export async function createVoyage(data: {
  name: string;
  description?: string;
  /** Legacy flat-list mode (voyage_playlists). */
  playlists?: { id: number; orderIndex?: number }[];
  /** Tree mode (voyage_nodes). When provided, playlists is ignored. */
  nodes?: {
    playlistId: number;
    isMainPath: boolean;
    branchType: "required" | "optional";
    parentPlaylistId: number | null;
    orderIndex: number;
    label: string;
  }[];
  status?: "draft" | "published";
  authorId?: number;
}) {
  if (!(await requireAdminOrFaculty())) {
    return { ok: false, error: "Unauthorized", data: null };
  }
  try {
    const dataToSend: Record<string, unknown> = {
      name: data.name,
      description: data.description ?? "",
      status: data.status ?? "draft",
    };

    if (data.nodes && data.nodes.length > 0) {
      // Tree mode: voyage_nodes will be created separately after voyage is saved.
      // For now, store the node count as a signal that tree mode was used.
      // The actual voyage-node records are created via createVoyageNodes after this call.
      dataToSend.voyage_playlists = [];
    } else if (data.playlists) {
      dataToSend.voyage_playlists = data.playlists.map((p, i) => ({
        playlist: p.id,
        orderIndex: p.orderIndex ?? i,
      }));
    }

    if (data.authorId) {
      dataToSend.authors = { connect: [data.authorId] };
    }

    const response = await fetch(`${NEXT_PUBLIC_STRAPI_API_URL}/api/voyages`, {
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
        error: responseData.error?.message || "Failed to create voyage",
        data: null,
      };
    }

    revalidateTag(CACHE_TAGS.voyages);
    revalidateTag(CACHE_TAGS.userContent);
    return {
      ok: true,
      error: null,
      data: flattenAttributes(responseData.data),
    };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to create voyage.",
      data: null,
    };
  }
}

/**
 * Updates an existing Voyage.
 * @param id The ID of the Voyage to update.
 * @param data The updated voyage data.
 * @returns The updated Voyage, or an error.
 */
export async function updateVoyage(
  id: number,
  data: {
    name?: string;
    description?: string;
    playlists?: { id: number }[];
    status?: "draft" | "published";
  },
) {
  if (!(await requireAdminOrFaculty())) {
    return { ok: false, error: "Unauthorized", data: null };
  }
  try {
    const dataToSend: Record<string, unknown> = {};

    if (data.name !== undefined) dataToSend.name = data.name;
    if (data.description !== undefined)
      dataToSend.description = data.description;
    if (data.status !== undefined) dataToSend.status = data.status;
    if (data.playlists !== undefined) {
      dataToSend.voyage_playlists = data.playlists.map((p, i) => ({
        playlist: p.id,
        orderIndex: i,
      }));
    }

    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/voyages/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ data: dataToSend }),
      },
    );

    const responseData = await response.json();

    if (!response.ok || (response.ok && responseData.error)) {
      return {
        ok: false,
        error: responseData.error?.message || "Failed to update voyage",
        data: null,
      };
    }

    revalidateTag(CACHE_TAGS.voyages);
    revalidateTag(CACHE_TAGS.userContent);
    return {
      ok: true,
      error: null,
      data: flattenAttributes(responseData.data),
    };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to update voyage.",
      data: null,
    };
  }
}

/**
 * Creates a new Voyage with tree-structured voyage nodes. Faculty/Admin only.
 *
 * The creation is a two-phase operation:
 *   1. POST the voyage record (name, description, status, authors).
 *   2. POST each voyage node sequentially — main path nodes first (collecting
 *      their Strapi IDs), then branch nodes (using the parent's resolved ID).
 *
 * On failure during node creation, attempts to DELETE the already-created
 * voyage to avoid orphaned records.
 *
 * @param data The voyage and node data to create.
 * @returns The created Voyage, or an error.
 */
export async function createVoyageWithNodes(data: {
  name: string;
  description?: string;
  status?: "draft" | "published";
  authorId?: number;
  nodes: {
    playlistId: number;
    label: string;
    isMainPath: boolean;
    branchType: "required" | "optional";
    parentPlaylistId: number | null;
    orderIndex: number;
  }[];
}) {
  if (!(await requireAdminOrFaculty())) {
    return { ok: false, error: "Unauthorized", data: null };
  }
  try {
    // Phase 1: create the voyage record
    const voyageBody: Record<string, unknown> = {
      name: data.name,
      description: data.description ?? "",
      status: data.status ?? "draft",
    };
    if (data.authorId) {
      voyageBody.authors = { connect: [data.authorId] };
    }

    const voyageResponse = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/voyages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ data: voyageBody }),
      },
    );

    const voyageData = await voyageResponse.json();

    if (!voyageResponse.ok || (voyageResponse.ok && voyageData.error)) {
      return {
        ok: false,
        error: voyageData.error?.message || "Failed to create voyage",
        data: null,
      };
    }

    const voyage = flattenAttributes(voyageData.data) as { id: number };
    const voyageId = voyage.id;

    // Phase 2: create voyage nodes — main path first, then branches
    const mainNodes = data.nodes.filter((n) => n.isMainPath);
    const branchNodes = data.nodes.filter((n) => !n.isMainPath);

    // Map from playlistId → Strapi node ID (populated while creating main nodes)
    const playlistIdToNodeId = new Map<number, number>();

    async function postNode(nodeBody: Record<string, unknown>): Promise<{
      ok: boolean;
      error: string | null;
      nodeId: number | null;
    }> {
      const nodeResponse = await fetch(
        `${NEXT_PUBLIC_STRAPI_API_URL}/api/voyage-nodes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({ data: nodeBody }),
        },
      );

      const nodeData = await nodeResponse.json();

      if (!nodeResponse.ok || (nodeResponse.ok && nodeData.error)) {
        return {
          ok: false,
          error: nodeData.error?.message || "Failed to create voyage node",
          nodeId: null,
        };
      }

      const node = flattenAttributes(nodeData.data) as { id: number };
      return { ok: true, error: null, nodeId: node.id };
    }

    async function cleanupVoyage() {
      try {
        await fetch(`${NEXT_PUBLIC_STRAPI_API_URL}/api/voyages/${voyageId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
          },
        });
      } catch {
        // Best-effort cleanup — log but do not rethrow
        console.error(`Failed to clean up voyage ${voyageId} after node error`);
      }
    }

    // Create main path nodes
    for (const node of mainNodes) {
      const { ok, error, nodeId } = await postNode({
        voyage: voyageId,
        playlist: node.playlistId,
        label: node.label,
        isMainPath: true,
        branchType: node.branchType,
        nodeType: "playlist",
        orderIndex: node.orderIndex,
      });

      if (!ok) {
        await cleanupVoyage();
        return { ok: false, error, data: null };
      }

      playlistIdToNodeId.set(node.playlistId, nodeId!);
    }

    // Create branch nodes, resolving parent by playlistId → Strapi node ID
    for (const node of branchNodes) {
      const parentNodeId =
        node.parentPlaylistId != null
          ? playlistIdToNodeId.get(node.parentPlaylistId) ?? null
          : null;

      if (parentNodeId === null && node.parentPlaylistId != null) {
        await cleanupVoyage();
        return {
          ok: false,
          error: `Branch node "${node.label}" references unknown parent playlist.`,
          data: null,
        };
      }

      const nodeBody: Record<string, unknown> = {
        voyage: voyageId,
        playlist: node.playlistId,
        label: node.label,
        isMainPath: false,
        branchType: node.branchType,
        nodeType: "playlist",
        orderIndex: node.orderIndex,
      };

      if (parentNodeId != null) {
        nodeBody.parentNode = parentNodeId;
      }

      const { ok, error, nodeId } = await postNode(nodeBody);

      if (!ok) {
        await cleanupVoyage();
        return { ok: false, error, data: null };
      }

      playlistIdToNodeId.set(node.playlistId, nodeId!);
    }

    revalidateTag(CACHE_TAGS.voyages);
    revalidateTag(CACHE_TAGS.userContent);
    return { ok: true, error: null, data: voyage };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to create voyage.",
      data: null,
    };
  }
}

/**
 * Deletes a Voyage by ID.
 * @param id The ID of the Voyage to delete.
 * @returns Success/failure result.
 */
export async function deleteVoyage(id: number) {
  if (!(await requireAdminOrFaculty())) {
    return { ok: false, error: "Unauthorized", data: null };
  }
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/voyages/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
      },
    );

    if (!response.ok) {
      return { ok: false, error: "Failed to delete voyage.", data: null };
    }

    const data = await response.json();

    revalidateTag(CACHE_TAGS.voyages);
    revalidateTag(CACHE_TAGS.userContent);
    return { ok: true, error: null, data: flattenAttributes(data.data) };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to delete voyage.",
      data: null,
    };
  }
}
