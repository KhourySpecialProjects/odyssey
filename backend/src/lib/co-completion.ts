// Droplet pair and per-droplet completion counts (ODY-962, ODY-976). Aggregates only.
const ENROLLMENT_UID = 'api::enrollment.enrollment';

export const MIN_PAIR_COUNT = 3;
export const MAX_TARGETS_PER_SOURCE = 20;

export type CoCompletionPair = { source: number; target: number; count: number };
export type CompletionCount = { droplet: number; count: number };

// Distinct finished (student, droplet) rows; each call builds a fresh knex builder.
function finishedRows() {
  // Metadata types are loose; these attributes always carry these fields.
  const meta = strapi.db.metadata.get(ENROLLMENT_UID);
  const attrs = meta.attributes as Record<string, any>;
  const table: string = meta.tableName;
  const id: string = attrs.id.columnName;
  const complete: string = attrs.isComplete.columnName;
  const user = attrs.authorizedUser.joinTable;
  const droplet = attrs.droplet.joinTable;
  const knex = strapi.db.connection;

  const done = knex(table)
    .distinct({
      user_id: `${user.name}.${user.inverseJoinColumn.name}`,
      droplet_id: `${droplet.name}.${droplet.inverseJoinColumn.name}`,
    })
    .join(user.name, `${user.name}.${user.joinColumn.name}`, `${table}.${id}`)
    .join(droplet.name, `${droplet.name}.${droplet.joinColumn.name}`, `${table}.${id}`)
    .where(`${table}.${complete}`, true);
  return { knex, done };
}

export async function coCompletionPairs({
  minCount = MIN_PAIR_COUNT,
  perSource = MAX_TARGETS_PER_SOURCE,
}: { minCount?: number; perSource?: number } = {}): Promise<CoCompletionPair[]> {
  const { knex, done } = finishedRows();

  const rows = await knex
    .with('done', done)
    .select({ source: 'a.droplet_id', target: 'b.droplet_id' })
    .count({ count: '*' })
    .from({ a: 'done' })
    .join({ b: 'done' }, function () {
      this.on('a.user_id', 'b.user_id').andOn('a.droplet_id', '<>', 'b.droplet_id');
    })
    .groupBy('a.droplet_id', 'b.droplet_id')
    .havingRaw('count(*) >= ?', [minCount]);

  // Postgres returns count as a string.
  const pairs: CoCompletionPair[] = rows.map((r: any) => ({
    source: Number(r.source),
    target: Number(r.target),
    count: Number(r.count),
  }));
  pairs.sort((a, b) => a.source - b.source || b.count - a.count || a.target - b.target);

  const kept: CoCompletionPair[] = [];
  let prev: number | undefined;
  let n = 0;
  for (const pair of pairs) {
    n = pair.source === prev ? n + 1 : 1;
    prev = pair.source;
    if (n <= perSource) kept.push(pair);
  }
  return kept;
}

/** Distinct finishers per droplet, floored at minCount (ODY-976). */
export async function completionCounts({
  minCount = MIN_PAIR_COUNT,
}: { minCount?: number } = {}): Promise<CompletionCount[]> {
  const { knex, done } = finishedRows();
  const rows = await knex
    .with('done', done)
    .select({ droplet: 'droplet_id' })
    .count({ count: '*' })
    .from('done')
    .groupBy('droplet_id')
    .havingRaw('count(*) >= ?', [minCount]);

  // Postgres returns count as a string.
  const counts: CompletionCount[] = rows.map((r: any) => ({
    droplet: Number(r.droplet),
    count: Number(r.count),
  }));
  return counts.sort((a, b) => a.droplet - b.droplet);
}
