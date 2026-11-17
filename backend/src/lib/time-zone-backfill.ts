// The timeZone enum values used to end in two spaces, and listed
// "America/Honolulu", which is not an IANA zone (ODY-627). Rows saved before
// the fix keep the old values until this runs; a no-op once caught up.
// db.query skips the enum check, which the old values now fail.
const USER_UID = 'api::authorized-user.authorized-user';

const RENAMED: Record<string, string> = { 'America/Honolulu': 'Pacific/Honolulu' };

export async function backfillTimeZones(): Promise<number> {
  return strapi.db.transaction(async () => {
    const stale: Array<{ id: number; timeZone: string }> = await strapi.db
      .query(USER_UID)
      .findMany({
        select: ['id', 'timeZone'],
        where: {
          $or: [
            { timeZone: { $endsWith: ' ' } },
            { timeZone: { $startsWith: ' ' } },
            { timeZone: { $in: Object.keys(RENAMED) } },
          ],
        },
      });

    const idsByZone = new Map<string, number[]>();
    for (const { id, timeZone } of stale) {
      const trimmed = timeZone.trim();
      const zone = RENAMED[trimmed] ?? trimmed;
      idsByZone.set(zone, [...(idsByZone.get(zone) ?? []), id]);
    }

    let count = 0;
    for (const [zone, ids] of idsByZone) {
      const result = await strapi.db.query(USER_UID).updateMany({
        where: { id: { $in: ids } },
        data: { timeZone: zone },
      });
      count += result.count;
    }
    return count;
  });
}
