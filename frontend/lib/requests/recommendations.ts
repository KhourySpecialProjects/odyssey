"use server";

import { revalidateTag } from "next/cache";
import { withAuth } from "@/lib/auth/guards";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getRecommendations } from "@/lib/recommendations";
import {
  resolveDocumentId,
  StrapiEntryNotFoundError,
} from "@/lib/strapi-document-id";
import { STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";
import {
  RecommendationDropletIdSchema,
  RecommendationOptionsSchema,
} from "@/lib/validations/recommendations";
import type { Recommendation, RecommendationOptions } from "@/types";

/** The signed-in learner's recommended droplets (ODY-952). Only ever the caller's own. */
export async function getMyRecommendations(
  options: RecommendationOptions,
): Promise<
  | { ok: true; error: null; data: Recommendation[] }
  | { ok: false; error: string; data: null }
> {
  return withAuth([], async (user) => {
    const parsed = RecommendationOptionsSchema.safeParse(options);
    if (!parsed.success) {
      return { ok: false as const, error: "invalid_options", data: null };
    }
    try {
      const data = await getRecommendations(user.id, parsed.data);
      return { ok: true as const, error: null, data };
    } catch (error) {
      console.error("Error getting recommendations:", error);
      return {
        ok: false as const,
        error: "Couldn't load recommendations.",
        data: null,
      };
    }
  });
}

const DISMISS_FAILED = "Couldn't dismiss that droplet." as const;

/** Hides a droplet from the caller's recommendations for good (ODY-954). Takes the numeric id. */
export async function dismissRecommendation(dropletId: number): Promise<
  | { ok: true; error: null; data: null }
  | {
      ok: false;
      error:
        | "unauthenticated"
        | "forbidden"
        | "invalid_droplet"
        | "not_found"
        | typeof DISMISS_FAILED;
      data: null;
    }
> {
  return withAuth([], async (user) => {
    const parsed = RecommendationDropletIdSchema.safeParse(dropletId);
    if (!parsed.success) {
      return {
        ok: false as const,
        error: "invalid_droplet" as const,
        data: null,
      };
    }
    try {
      const me = await resolveDocumentId("authorized-users", {
        id: user.id,
        documentId: user.documentId,
      });
      let droplet: string;
      try {
        droplet = await resolveDocumentId("droplets", parsed.data);
      } catch (error) {
        // not_found means the droplet only, never the caller's own account
        if (!(error instanceof StrapiEntryNotFoundError)) throw error;
        return { ok: false as const, error: "not_found" as const, data: null };
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/recommendation-dismissals`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
            ...STRAPI_RESPONSE_FORMAT_HEADER,
          },
          body: JSON.stringify({ data: { user: me, droplet } }),
          cache: "no-store",
        },
      );
      if (!res.ok) {
        console.error("dismissRecommendation failed:", res.status);
        return { ok: false as const, error: DISMISS_FAILED, data: null };
      }
      revalidateTag(CACHE_TAGS.recommendations(user.id));
      return { ok: true as const, error: null, data: null };
    } catch (error) {
      console.error("dismissRecommendation failed:", (error as Error)?.name);
      return { ok: false as const, error: DISMISS_FAILED, data: null };
    }
  });
}
