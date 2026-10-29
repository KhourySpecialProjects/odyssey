// Score with AI's cost limits and model prices (ODY-815): one row, edited in
// the admin, seeded with placeholders the first time Strapi starts.
const SETTINGS_UID = 'api::ai-scoring-setting.ai-scoring-setting';

/** US dollars per million tokens */
export type ModelPrice = {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
};

export type AiScoringSettings = {
  /** Score with AI refuses to start once this month's spend reaches it */
  monthlyCapUsd: number;
  /** A single run stops once it has spent this much */
  perRunCapUsd: number;
  /** By model id */
  prices: Record<string, ModelPrice>;
};

/**
 * Conservative placeholders until the real amounts are agreed (open question
 * 7 on ODY-798). Prices match `frontend/lib/ai-review/models.ts`, Anthropic's
 * list in October 2026; Haiku 5.5's higher price past 100K prompt tokens isn't
 * modelled.
 */
export const AI_SCORING_SETTINGS_SEED = {
  monthlyCapUsd: 25,
  perRunCapUsd: 2,
  prices: [
    { model: 'claude-sonnet-5-5', inputPerMillionUsd: 2, outputPerMillionUsd: 10 },
    { model: 'claude-haiku-5-5', inputPerMillionUsd: 0.1, outputPerMillionUsd: 0.5 },
  ],
};

type Row = Record<string, any>;

/** Creates the settings with the placeholders when there are none. True when it did. */
export async function seedAiScoringSettings(): Promise<boolean> {
  return strapi.db.transaction(async () => {
    const documents = strapi.documents(SETTINGS_UID);
    if (await documents.findFirst({ fields: ['id'] } as any)) return false;
    await documents.create({ data: AI_SCORING_SETTINGS_SEED } as any);
    return true;
  });
}

// Postgres returns decimals as strings.
const toSettings = (row: Row): AiScoringSettings => ({
  monthlyCapUsd: Number(row.monthlyCapUsd),
  perRunCapUsd: Number(row.perRunCapUsd),
  prices: Object.fromEntries(
    ((row.prices ?? []) as Row[]).map((p) => [
      p.model,
      {
        inputPerMillionUsd: Number(p.inputPerMillionUsd),
        outputPerMillionUsd: Number(p.outputPerMillionUsd),
      },
    ]),
  ),
});

/**
 * The current settings. If the row is missing (the seed failed), the
 * placeholders apply, so the limits are never off.
 */
export async function loadAiScoringSettings(): Promise<AiScoringSettings> {
  const row = (await strapi.documents(SETTINGS_UID).findFirst({
    sort: ['id:asc'],
    populate: { prices: true },
  } as any)) as Row | null;
  return toSettings(row ?? AI_SCORING_SETTINGS_SEED);
}
