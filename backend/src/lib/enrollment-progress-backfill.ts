// Gives started enrollments (at least one viewed lesson) a lastProgressDate of
// their updatedAt (ODY-928). Never-started ones stay null; a no-op once caught up.
const ENROLLMENT_UID = 'api::enrollment.enrollment';
const BATCH_SIZE = 200;

export async function backfillLastProgress(): Promise<number> {
  return strapi.db.transaction(async () => {
    // The lessons join can repeat an enrollment, so key by id.
    const rows: Array<{ id: number; updatedAt: string | Date | null }> = await strapi.db
      .query(ENROLLMENT_UID)
      .findMany({
        select: ['id', 'updatedAt'],
        where: { lastProgressDate: { $null: true }, viewedLessons: { id: { $notNull: true } } },
      });
    const byId = new Map(rows.filter((r) => r.updatedAt).map((r) => [r.id, r.updatedAt]));
    const entries = [...byId];

    let count = 0;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      for (const [id, updatedAt] of entries.slice(i, i + BATCH_SIZE)) {
        // Passing updatedAt back keeps it from moving.
        const result = await strapi.db.query(ENROLLMENT_UID).updateMany({
          where: { id, lastProgressDate: { $null: true } },
          data: { lastProgressDate: updatedAt, updatedAt },
        });
        count += result.count;
      }
    }
    return count;
  });
}
