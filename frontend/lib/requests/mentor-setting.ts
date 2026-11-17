import { CACHE_TAGS } from "@/lib/cache-tags";
import { fetchAPI } from "@/lib/utils";

type MentorSetting = {
  enabled?: boolean | null;
  pilotGroups?: { id: number }[] | null;
};

const CLOSED = { enabled: false, pilotGroupIds: [] as number[] };

/** Mentor's on/off switch and pilot group ids; closed on any failure. */
export async function getMentorSetting(): Promise<{
  enabled: boolean;
  pilotGroupIds: number[];
}> {
  try {
    const setting = await fetchAPI<MentorSetting | null>("/mentor-setting", {
      urlParams: {
        fields: ["enabled"],
        populate: { pilotGroups: { fields: ["id"] } },
      },
      next: { tags: [CACHE_TAGS.mentorSetting], revalidate: 60 },
    });
    return {
      enabled: setting?.enabled === true,
      pilotGroupIds: (setting?.pilotGroups ?? []).map((g) => g.id),
    };
  } catch {
    return CLOSED;
  }
}

/**
 * Whether the Ask Mentor button may show for this user: Mentor is on and the
 * user is in a pilot group (any user when none are set). Closed on failure.
 */
export async function mentorVisibleFor(
  { enabled, pilotGroupIds }: { enabled: boolean; pilotGroupIds: number[] },
  userId: number,
): Promise<boolean> {
  if (!enabled) return false;
  if (pilotGroupIds.length === 0) return true;
  try {
    const groups = await fetchAPI<{ id: number }[] | null>("/groups", {
      urlParams: {
        filters: {
          id: { $in: pilotGroupIds },
          members: { id: { $eq: userId } },
        },
        fields: ["id"],
        pagination: { pageSize: 1 },
      },
      next: {
        tags: [CACHE_TAGS.allGroups, CACHE_TAGS.userGroups(userId)],
        revalidate: 60,
      },
    });
    return (groups?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
