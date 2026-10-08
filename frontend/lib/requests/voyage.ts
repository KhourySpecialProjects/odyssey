"use server";

import { Voyage } from "@/types";
import {
  fetchAPI,
  flattenAttributes,
  STRAPI_RESPONSE_FORMAT_HEADER,
} from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "../cache-tags";
import { LISTED_DROPLET_FILTER } from "../droplet-visibility";
import { requireRole } from "@/lib/auth/require-role";
import { assertOwner } from "@/lib/auth/guards";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { VoyageTreeSchema } from "@/lib/validations/voyage";
import {
  resolveDocumentId,
  resolveDocumentIds,
  strapiEntryUrl,
  StrapiEntryNotFoundError,
  type EntryRef,
  type StrapiCollection,
} from "@/lib/strapi-document-id";
import { readJsonOrNull } from "@/lib/strapi-response";

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
    ...STRAPI_RESPONSE_FORMAT_HEADER,
  };
}

/**
 * Like strapiEntryUrl, but returns null when the entry no longer exists so the
 * caller can return the same result a Strapi 404 used to produce.
 */
async function entryUrlOrNull(
  collection: StrapiCollection,
  ref: EntryRef,
): Promise<string | null> {
  try {
    return await strapiEntryUrl(collection, ref);
  } catch (error) {
    if (error instanceof StrapiEntryNotFoundError) return null;
    throw error;
  }
}

async function postNode(nodeBody: Record<string, unknown>): Promise<{
  ok: boolean;
  error: string | null;
  node: { id: number; documentId?: string } | null;
}> {
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
      node: null,
    };
  }

  const node = flattenAttributes(data.data) as {
    id: number;
    documentId?: string;
  };
  return { ok: true, error: null, node };
}

interface NodeInput {
  localId: string;
  nodeType: "playlist" | "droplet";
  playlistId: number | null;
  dropletId: number | null;
  label: string;
  isMainPath: boolean;
  branchType: "required" | "optional";
  parentLocalId: string | null;
  orderIndex: number;
}

/**
 * Creates voyage nodes in two phases: main path first, then branches.
 * Returns an error string on failure, or null on success.
 */
async function createVoyageNodes(
  voyage: EntryRef,
  nodes: NodeInput[],
): Promise<string | null> {
  const mainNodes = nodes.filter((n) => n.parentLocalId === null);
  const branchNodes = nodes.filter((n) => n.parentLocalId !== null);
  const localIdToNode = new Map<string, { id: number; documentId?: string }>();

  // Relation values in node bodies are documentIds on Strapi v5.
  let voyageDocId: string;
  const playlistDocIds = new Map<number, string>();
  const dropletDocIds = new Map<number, string>();
  try {
    const playlistIds = [
      ...new Set(
        nodes.flatMap((n) =>
          n.nodeType === "playlist" && n.playlistId != null
            ? [n.playlistId]
            : [],
        ),
      ),
    ];
    const dropletIds = [
      ...new Set(
        nodes.flatMap((n) =>
          n.nodeType !== "playlist" && n.dropletId != null ? [n.dropletId] : [],
        ),
      ),
    ];
    const [voyageDoc, playlistDocs, dropletDocs] = await Promise.all([
      resolveDocumentId("voyages", voyage),
      resolveDocumentIds("playlists", playlistIds),
      resolveDocumentIds("droplets", dropletIds),
    ]);
    voyageDocId = voyageDoc;
    playlistIds.forEach((id, i) => playlistDocIds.set(id, playlistDocs[i]));
    dropletIds.forEach((id, i) => dropletDocIds.set(id, dropletDocs[i]));
  } catch (error) {
    if (error instanceof StrapiEntryNotFoundError) {
      return "Failed to create voyage node";
    }
    throw error;
  }

  // Main path nodes must be sequential (branches reference their IDs)
  for (const node of mainNodes) {
    const nodeBody: Record<string, unknown> = {
      voyage: voyageDocId,
      label: node.label,
      isMainPath: true,
      branchType: node.branchType,
      nodeType: node.nodeType,
      orderIndex: node.orderIndex,
    };

    if (node.nodeType === "playlist") {
      nodeBody.playlist =
        node.playlistId == null ? null : playlistDocIds.get(node.playlistId);
    } else {
      // droplet node
      if (node.dropletId != null) {
        nodeBody.droplet = dropletDocIds.get(node.dropletId);
      } else {
        nodeBody.claimStatus = "unclaimed";
      }
    }

    const { ok, error, node: created } = await postNode(nodeBody);
    if (!ok) return error;
    localIdToNode.set(node.localId, created!);
  }

  // Branch nodes resolve parent by localId -> Strapi node ID
  for (const node of branchNodes) {
    const parentNode =
      node.parentLocalId != null
        ? localIdToNode.get(node.parentLocalId) ?? null
        : null;

    if (parentNode === null && node.parentLocalId != null) {
      return `Branch node "${node.label}" references unknown parent.`;
    }

    const nodeBody: Record<string, unknown> = {
      voyage: voyageDocId,
      label: node.label,
      isMainPath: false,
      branchType: node.branchType,
      nodeType: node.nodeType,
      orderIndex: node.orderIndex,
    };

    if (node.nodeType === "playlist") {
      nodeBody.playlist =
        node.playlistId == null ? null : playlistDocIds.get(node.playlistId);
    } else {
      if (node.dropletId != null) {
        nodeBody.droplet = dropletDocIds.get(node.dropletId);
      } else {
        nodeBody.claimStatus = "unclaimed";
      }
    }

    if (parentNode != null) {
      nodeBody.parentNode = await resolveDocumentId("voyage-nodes", parentNode);
    }

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
      isArchived: { $eq: false },
    },
    populate: {
      voyage_nodes: {
        fields: [
          "id",
          "isMainPath",
          "branchType",
          "orderIndex",
          "label",
          "nodeType",
          "claimStatus",
        ],
        populate: {
          playlist: {
            fields: ["id", "slug", "name"],
            populate: {
              droplets: { fields: ["id"], filters: LISTED_DROPLET_FILTER },
            },
          },
          droplet: {
            fields: ["id", "slug", "name", "status", "isHidden"],
          },
          parentNode: { fields: ["id"] },
        },
      },
      authors: {
        fields: ["id"],
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
    populate: {
      authors: {
        fields: ["id", "firstName", "email"],
      },
      voyage_nodes: {
        fields: ["id", "isMainPath", "nodeType", "claimStatus"],
        populate: {
          playlist: {
            fields: ["id"],
            populate: { droplets: { fields: ["id"] } },
          },
          droplet: { fields: ["id", "status"] },
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
              droplets: { fields: ["id"], filters: LISTED_DROPLET_FILTER },
            },
          },
          droplet: {
            fields: ["id", "name", "slug", "status", "isHidden"],
            populate: { authorized_users: { fields: ["id"] } },
          },
          claimedBy: { fields: ["id"] },
          parentNode: { fields: ["id"] },
        },
        sort: ["orderIndex:asc"],
      },
      authors: {
        fields: ["id"],
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
  const gate = await requireRole([
    AuthorizedUserRoleTitle.SysAdmin,
    AuthorizedUserRoleTitle.Faculty,
  ]);
  if (!gate.ok) {
    return { ok: false, error: "Unauthorized", data: null };
  }

  const parsed = VoyageTreeSchema.safeParse({
    name: data.name,
    description: data.description,
    nodes: data.nodes,
  });
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", data: null };
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
      try {
        voyageBody.authors = {
          connect: [await resolveDocumentId("authorized-users", data.authorId)],
        };
      } catch (error) {
        if (error instanceof StrapiEntryNotFoundError) {
          return { ok: false, error: "Failed to create voyage", data: null };
        }
        throw error;
      }
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
      const msg = voyageData.error?.message || "Failed to create voyage";
      const isUnique =
        msg.toLowerCase().includes("unique") ||
        voyageData.error?.details?.errors?.some(
          (e: { path: string[] }) =>
            e.path?.includes("slug") || e.path?.includes("name"),
        );
      return {
        ok: false,
        error: isUnique
          ? "A voyage with this name already exists. Please choose a different name."
          : msg,
        data: null,
      };
    }

    const voyage = flattenAttributes(voyageData.data) as {
      id: number;
      documentId?: string;
      slug: string;
    };

    // Phase 2: create voyage nodes
    const nodeError = await createVoyageNodes(voyage, data.nodes);
    if (nodeError) {
      // Best-effort cleanup of the orphaned voyage
      await fetch(await strapiEntryUrl("voyages", voyage), {
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
    revalidateTag(CACHE_TAGS.allUserContent);
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
  const gate = await requireRole([
    AuthorizedUserRoleTitle.SysAdmin,
    AuthorizedUserRoleTitle.Faculty,
  ]);
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }

  const isAdmin = gate.user.roles.includes(AuthorizedUserRoleTitle.SysAdmin);

  let voyageRef: EntryRef = id;
  if (!isAdmin) {
    // Faculty: verify ownership
    const voyage = await fetchAPI<{
      id: number;
      documentId?: string;
      authors?: { id: number }[];
    } | null>(`/voyages/${await resolveDocumentId("voyages", id)}`, {
      urlParams: { populate: { authors: { fields: ["id"] } } },
      next: { tags: [CACHE_TAGS.voyages], revalidate: 0 },
    });
    if (!voyage) {
      return { ok: false, error: "not_found" };
    }
    voyageRef = { id, documentId: voyage.documentId };
    const authorIds = voyage.authors?.map((a) => a.id) ?? [];
    if (!authorIds.includes(gate.user.id)) {
      return { ok: false, error: "forbidden" };
    }
  }

  try {
    const url = await entryUrlOrNull("voyages", voyageRef);
    if (!url) return { ok: false, error: "Not Found" };

    const response = await fetch(url, {
      method: "PUT",
      headers: strapiHeaders(),
      body: JSON.stringify({ data: { status: "published" } }),
    });

    if (!response.ok) {
      const err = await response.json();
      return {
        ok: false,
        error: err.error?.message || "Failed to publish voyage",
      };
    }

    revalidateTag(CACHE_TAGS.voyages);
    revalidateTag(CACHE_TAGS.allUserContent);
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
  const updateGate = await requireRole([
    AuthorizedUserRoleTitle.SysAdmin,
    AuthorizedUserRoleTitle.Faculty,
  ]);
  if (!updateGate.ok) {
    return { ok: false, error: "Unauthorized", data: null };
  }
  try {
    const slug = generateSlug(data.name);

    // Phase 1: PUT the voyage record
    const voyageUrl = await entryUrlOrNull("voyages", data.id);
    if (!voyageUrl) {
      return { ok: false, error: "Not Found", data: null };
    }
    const voyageResponse = await fetch(voyageUrl, {
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
    });

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
      documentId?: string;
      slug: string;
    };

    // Phase 2: Delete all existing nodes for this voyage. fetchAPI prepends
    // `/api` to the path, so the path here must be `/voyage-nodes`, NOT
    // `/api/voyage-nodes` (that would double-prefix and 404).
    type NodeRef = { id: number; documentId?: string };
    const branchNodes: NodeRef[] = [];
    const mainNodes: NodeRef[] = [];
    let page = 1;
    for (;;) {
      const nodesPage = await fetchAPI<
        { id: number; documentId?: string; isMainPath: boolean }[]
      >(`/voyage-nodes`, {
        urlParams: {
          filters: { voyage: { id: { $eq: data.id } } },
          pagination: { page, pageSize: 100 },
          fields: ["id", "isMainPath"],
        },
        next: { tags: [CACHE_TAGS.voyages] },
      });
      if (!Array.isArray(nodesPage)) break;
      for (const n of nodesPage) {
        const ref = { id: n.id, documentId: n.documentId };
        if (n.isMainPath) mainNodes.push(ref);
        else branchNodes.push(ref);
      }
      if (nodesPage.length < 100) break;
      page++;
    }

    const deleteNode = async (node: NodeRef) => {
      // No entry = already deleted, treat as success.
      const nodeUrl = await entryUrlOrNull("voyage-nodes", node);
      if (!nodeUrl) return;
      const res = await fetch(nodeUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
        },
      });
      // 404 = already deleted, treat as success.
      if (!res.ok && res.status !== 404) {
        throw new Error(`Failed to delete voyage-node ${node.id}`);
      }
    };

    // Branches hold parentNode FKs pointing to main nodes — delete branches
    // first so main deletes never race against a live child FK.
    await Promise.all(branchNodes.map(deleteNode));
    await Promise.all(mainNodes.map(deleteNode));

    // Phase 3: Re-create nodes (main path first, then branches)
    const nodeError = await createVoyageNodes(voyage, data.nodes);
    if (nodeError) return { ok: false, error: nodeError, data: null };

    revalidateTag(CACHE_TAGS.voyages);
    revalidateTag(CACHE_TAGS.allUserContent);
    return { ok: true, error: null, data: voyage };
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      ok: false,
      error: `Database Error: ${message}`,
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
  const gate = await requireRole([
    AuthorizedUserRoleTitle.SysAdmin,
    AuthorizedUserRoleTitle.Faculty,
  ]);
  if (!gate.ok) {
    return { ok: false, error: gate.error, data: null };
  }

  const isAdmin = gate.user.roles.includes(AuthorizedUserRoleTitle.SysAdmin);

  let voyageRef: EntryRef = id;
  if (!isAdmin) {
    // Faculty: verify ownership
    const voyage = await fetchAPI<{
      id: number;
      documentId?: string;
      authors?: { id: number }[];
    } | null>(`/voyages/${await resolveDocumentId("voyages", id)}`, {
      urlParams: { populate: { authors: { fields: ["id"] } } },
      next: { tags: [CACHE_TAGS.voyages], revalidate: 0 },
    });
    if (!voyage) {
      return { ok: false, error: "not_found", data: null };
    }
    voyageRef = { id, documentId: voyage.documentId };
    const authorIds = voyage.authors?.map((a) => a.id) ?? [];
    if (!authorIds.includes(gate.user.id)) {
      return { ok: false, error: "forbidden", data: null };
    }
  }

  try {
    const url = await entryUrlOrNull("voyages", voyageRef);
    if (!url) {
      return { ok: false, error: "Failed to delete voyage.", data: null };
    }

    const response = await fetch(url, {
      method: "DELETE",
      headers: strapiHeaders(),
    });

    if (!response.ok) {
      return { ok: false, error: "Failed to delete voyage.", data: null };
    }

    const body = await readJsonOrNull(response);

    revalidateTag(CACHE_TAGS.voyages);
    revalidateTag(CACHE_TAGS.allUserContent);
    return {
      ok: true,
      error: null,
      data: flattenAttributes(body?.data ?? null),
    };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Database Error: Failed to delete voyage.",
      data: null,
    };
  }
}

export async function getArchivedVoyagesForAuthor(
  authorizedUserId: number,
): Promise<Voyage[]> {
  const path = `/voyages`;
  const urlParams = {
    filters: {
      isArchived: { $eq: true },
      authors: { id: { $eq: authorizedUserId } },
    },
    populate: {
      authors: { fields: ["id"] },
      voyage_nodes: {
        fields: ["id", "isMainPath", "nodeType", "claimStatus"],
        populate: {
          playlist: {
            fields: ["id"],
            populate: { droplets: { fields: ["id"] } },
          },
          droplet: { fields: ["id"] },
        },
      },
    },
    sort: ["name:asc"],
    pagination: { pageSize: 200, page: 1 },
  };

  return await fetchAPI<Voyage[]>(path, {
    urlParams,
    next: { tags: [CACHE_TAGS.voyages], revalidate: 0 },
  });
}

export async function archiveVoyage(voyageId: number, archiveState: boolean) {
  const gate = await requireRole([]);
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    const voyage = await fetchAPI<Voyage>(
      `/voyages/${await resolveDocumentId("voyages", voyageId)}`,
      {
        urlParams: { populate: { authors: { fields: ["id"] } } },
        next: { tags: [CACHE_TAGS.voyages], revalidate: 0 },
      },
    );

    if (!voyage) {
      return { success: false, error: "Voyage not found" };
    }

    const owner = assertOwner(
      voyage.authors?.map((a) => a.id),
      gate.user,
    );
    if (!owner.ok) return { success: false, error: owner.error };

    const url = await entryUrlOrNull("voyages", {
      id: voyageId,
      documentId: voyage.documentId,
    });
    if (!url) return { success: false, error: "Failed to archive voyage" };

    const response = await fetch(url, {
      method: "PUT",
      headers: strapiHeaders(),
      body: JSON.stringify({ data: { isArchived: archiveState } }),
    });

    if (!response.ok) {
      return { success: false, error: "Failed to archive voyage" };
    }

    revalidateTag(CACHE_TAGS.voyages);
    revalidateTag(CACHE_TAGS.allUserContent);
    revalidateTag(CACHE_TAGS.allUserDashboards);
    return { success: true };
  } catch (error) {
    console.error("Error archiving voyage:", error);
    return { success: false, error };
  }
}
