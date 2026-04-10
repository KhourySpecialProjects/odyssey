"use server";

import qs from "qs";
import { Voyage } from "@/types";
import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "../cache-tags";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { requireRole } from "@/lib/auth/require-role";

const NEXT_PUBLIC_STRAPI_API_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337";
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function strapiHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
  };
}

async function postNode(
  nodeBody: Record<string, unknown>,
): Promise<{ ok: boolean; error: string | null; nodeId: number | null }> {
  const response = await fetch(
    `${NEXT_PUBLIC_STRAPI_API_URL}/api/voyage-nodes`,
    {
      method: "POST",
      headers: strapiHeaders(),
      body: JSON.stringify({ data: nodeBody }),
    },
  );

  const data = await response.json();
  if (!response.ok || data.error) {
    return {
      ok: false,
      error: data.error?.message || "Failed to create voyage node",
      nodeId: null,
    };
  }

  const node = flattenAttributes(data.data) as { id: number };
  return { ok: true, error: null, nodeId: node.id };
}

interface NodeInput {
  playlistId: number;
  label: string;
  isMainPath: boolean;
  branchType: "required" | "optional";
  parentPlaylistId: number | null;
  orderIndex: number;
}

/**
 * Creates voyage nodes in two phases: main path first, then branches.
 * Returns an error string on failure, or null on success.
 */
async function createVoyageNodes(
  voyageId: number,
  nodes: NodeInput[],
): Promise<string | null> {
  const mainNodes = nodes.filter((n) => n.isMainPath);
  const branchNodes = nodes.filter((n) => !n.isMainPath);
  const playlistIdToNodeId = new Map<number, number>();

  // Main path nodes must be sequential (branches reference their IDs)
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

    if (!ok) return error;
    playlistIdToNodeId.set(node.playlistId, nodeId!);
  }

  // Branch nodes resolve parent by playlistId -> Strapi node ID
  for (const node of branchNodes) {
    const parentNodeId =
      node.parentPlaylistId != null
        ? playlistIdToNodeId.get(node.parentPlaylistId) ?? null
        : null;

    if (parentNodeId === null && node.parentPlaylistId != null) {
      return `Branch node "${node.label}" references unknown parent playlist.`;
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
    if (parentNodeId != null) nodeBody.parentNode = parentNodeId;

    const { ok, error } = await postNode(nodeBody);
    if (!ok) return error;
  }

  return null;
}

/**
 * Gets all published voyages with their voyage_nodes populated.
 * @returns The list of published Voyages.
 */
export async function getVoyages(): Promise<Voyage[]> {
  const path = `/voyages`;
  const urlParams = {
    filters: {
      status: { $eq: "published" },
    },
    populate: {
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
      authors: {
        fields: ["id", "firstName", "email"],
      },
      voyage_nodes: {
        fields: ["id", "isMainPath"],
        populate: {
          playlist: {
            fields: ["id"],
            populate: { droplets: { fields: ["id"] } },
          },
        },
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
export async function getVoyageBySlug(
  slug: string,
  { includeDrafts = false }: { includeDrafts?: boolean } = {},
): Promise<Voyage | null> {
  const path = `/voyages`;
  const urlParams = {
    ...(includeDrafts && { publicationState: "preview" }),
    filters: {
      slug: { $eq: slug },
      ...(!includeDrafts && { status: { $eq: "published" } }),
    },
    populate: {
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
  isSequential?: boolean;
  authorId?: number;
  nodes: NodeInput[];
}) {
  const auth = await requireRole([
    AuthorizedUserRoleTitle.SysAdmin,
    AuthorizedUserRoleTitle.Faculty,
  ]);
  if (!auth.ok) {
    return { ok: false, error: "Unauthorized", data: null };
  }
  try {
    // Phase 1: create the voyage record
    const slug = generateSlug(data.name);
    const voyageBody: Record<string, unknown> = {
      name: data.name,
      slug,
      description: data.description ?? "",
      status: data.status ?? "draft",
      isSequential: data.isSequential ?? false,
    };
    if (data.authorId) {
      voyageBody.authors = { connect: [data.authorId] };
    }

    const voyageResponse = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/voyages`,
      {
        method: "POST",
        headers: strapiHeaders(),
        body: JSON.stringify({ data: voyageBody }),
      },
    );

    const voyageData = await voyageResponse.json();
    if (!voyageResponse.ok || voyageData.error) {
      return {
        ok: false,
        error: voyageData.error?.message || "Failed to create voyage",
        data: null,
      };
    }

    const voyage = flattenAttributes(voyageData.data) as {
      id: number;
      slug: string;
    };

    // Phase 2: create voyage nodes
    const nodeError = await createVoyageNodes(voyage.id, data.nodes);
    if (nodeError) {
      // Best-effort cleanup of the orphaned voyage
      await fetch(`${NEXT_PUBLIC_STRAPI_API_URL}/api/voyages/${voyage.id}`, {
        method: "DELETE",
        headers: strapiHeaders(),
      }).catch(() =>
        console.error(
          `Failed to clean up voyage ${voyage.id} after node error`,
        ),
      );
      return { ok: false, error: nodeError, data: null };
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
 * Publishes a draft Voyage by setting its status to "published".
 */
export async function publishVoyage(id: number) {
  const auth = await requireRole([
    AuthorizedUserRoleTitle.SysAdmin,
    AuthorizedUserRoleTitle.Faculty,
  ]);
  if (!auth.ok) {
    return { ok: false, error: "Unauthorized" };
  }
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/voyages/${id}`,
      {
        method: "PUT",
        headers: strapiHeaders(),
        body: JSON.stringify({ data: { status: "published" } }),
      },
    );

    if (!response.ok) {
      const err = await response.json();
      return {
        ok: false,
        error: err.error?.message || "Failed to publish voyage",
      };
    }

    revalidateTag(CACHE_TAGS.voyages);
    revalidateTag(CACHE_TAGS.userContent);
    return { ok: true, error: null };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Failed to publish voyage." };
  }
}

/**
 * Updates an existing Voyage and its tree-structured nodes. Faculty/Admin only.
 *
 * Strategy: PUT the voyage record, DELETE all existing nodes, then re-create
 * nodes from scratch using the same two-phase approach as creation.
 */
export async function updateVoyageWithNodes(data: {
  id: number;
  name: string;
  description?: string;
  status?: "draft" | "published";
  isSequential?: boolean;
  nodes: NodeInput[];
}) {
  if (!(await requireAdminOrFaculty())) {
    return { ok: false, error: "Unauthorized", data: null };
  }
  try {
    const slug = generateSlug(data.name);

    // Phase 1: PUT the voyage record
    const voyageResponse = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/voyages/${data.id}`,
      {
        method: "PUT",
        headers: strapiHeaders(),
        body: JSON.stringify({
          data: {
            name: data.name,
            slug,
            description: data.description ?? "",
            status: data.status ?? "draft",
            isSequential: data.isSequential ?? false,
          },
        }),
      },
    );

    const voyageJson = await voyageResponse.json();
    if (!voyageResponse.ok || voyageJson.error) {
      return {
        ok: false,
        error: voyageJson.error?.message || "Failed to update voyage",
        data: null,
      };
    }
    const voyage = flattenAttributes(voyageJson.data) as {
      id: number;
      slug: string;
    };

    // Phase 2: Delete all existing nodes for this voyage (paginated, with error checking)
    const allNodeIds: number[] = [];
    let page = 1;
    for (;;) {
      const query = qs.stringify({
        filters: { voyage: { id: { $eq: data.id } } },
        pagination: { page, pageSize: 100 },
        fields: ["id"],
      });
      const nodesPage = await fetchAPI(`/api/voyage-nodes?${query}`, {
        next: { tags: [CACHE_TAGS.voyages] },
      });
      if (Array.isArray(nodesPage)) {
        allNodeIds.push(...nodesPage.map((n: { id: number }) => n.id));
      }
      // fetchAPI auto-flattens, so pagination meta comes from the raw response;
      // break after one page if we got fewer than pageSize results
      if (!Array.isArray(nodesPage) || nodesPage.length < 100) break;
      page++;
    }

    await Promise.all(
      allNodeIds.map(async (nodeId) => {
        const res = await fetch(
          `${NEXT_PUBLIC_STRAPI_API_URL}/api/voyage-nodes/${nodeId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}` },
          },
        );
        if (!res.ok) {
          throw new Error(`Failed to delete voyage-node ${nodeId}`);
        }
        return res;
      }),
    );

    // Phase 3: Re-create nodes (main path first, then branches)
    const nodeError = await createVoyageNodes(data.id, data.nodes);
    if (nodeError) return { ok: false, error: nodeError, data: null };

    revalidateTag(CACHE_TAGS.voyages);
    revalidateTag(CACHE_TAGS.userContent);
    return { ok: true, error: null, data: voyage };
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
 * Deletes a Voyage by ID.
 * @param id The ID of the Voyage to delete.
 * @returns Success/failure result.
 */
export async function deleteVoyage(id: number) {
  const auth = await requireRole([
    AuthorizedUserRoleTitle.SysAdmin,
    AuthorizedUserRoleTitle.Faculty,
  ]);
  if (!auth.ok) {
    return { ok: false, error: "Unauthorized", data: null };
  }
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/voyages/${id}`,
      {
        method: "DELETE",
        headers: strapiHeaders(),
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
