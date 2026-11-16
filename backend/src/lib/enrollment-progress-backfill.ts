// Gives started enrollments (at least one viewed lesson) a lastProgressDate of
// their updatedAt (ODY-928). Never-started ones stay null; a no-op once caught up.
const ENROLLMENT_UID = 'api::enrollment.enrollment';

export async function backfillLastProgress(): Promise<number> {
  // Metadata types are loose; these attributes always carry these fields.
  const meta = strapi.db.metadata.get(ENROLLMENT_UID);
  const attrs = meta.attributes as Record<string, any>;
  const table: string = meta.tableName;
  const progress: string = attrs.lastProgressDate.columnName;
  const updated: string = attrs.updatedAt.columnName;
  const id: string = attrs.id.columnName;
  const join = attrs.viewedLessons.joinTable;
  const knex = strapi.db.connection;

  // One raw UPDATE, so updated_at stays put (Strapi's timestamp hook doesn't run).
  const count = await knex(table)
    .whereNull(progress)
    .whereNotNull(updated)
    .whereExists(
      knex(join.name)
        .select(knex.raw('1'))
        .whereRaw('?? = ??', [`${join.name}.${join.joinColumn.name}`, `${table}.${id}`])
    )
    .update({ [progress]: knex.ref(updated) });
  return Number(count);
}
