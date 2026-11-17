// Mentor's on/off switch, pilot groups and limits (ODY-884): one row, edited in
// the admin, seeded the first time Strapi starts. Mentor starts switched off.
const SETTINGS_UID = 'api::mentor-setting.mentor-setting';

export type MentorSettings = {
  /** Mentor refuses everyone while this is off */
  enabled: boolean;
  /** Group ids. Empty means everyone, when enabled */
  pilotGroupIds: number[];
  /** Mentor refuses once this month's Mentor spend reaches it */
  monthlyCapUsd: number;
  /** Answers one user may ask per day (Boston time), across all kinds */
  perUserDailyLimit: number;
  /** Students may share question and answer text; off until ODY-883 approves */
  storeSharedAnswers: boolean;
};

/** Placeholders; ODY-891 sets the real cap from the ODY-885 eval. */
export const MENTOR_SETTINGS_SEED = {
  enabled: false,
  monthlyCapUsd: 10,
  perUserDailyLimit: 30,
  storeSharedAnswers: false,
};

type Row = Record<string, any>;

/** Creates the settings, switched off, when there are none. True when it did. */
export async function seedMentorSettings(): Promise<boolean> {
  return strapi.db.transaction(async () => {
    const documents = strapi.documents(SETTINGS_UID);
    if (await documents.findFirst({ fields: ['id'] } as any)) return false;
    await documents.create({ data: MENTOR_SETTINGS_SEED } as any);
    return true;
  });
}

/**
 * The current settings. If the row is missing (the seed failed), the seed
 * applies, so Mentor is off, never on.
 */
export async function loadMentorSettings(): Promise<MentorSettings> {
  const row = (await strapi.documents(SETTINGS_UID).findFirst({
    sort: ['id:asc'],
    populate: { pilotGroups: { fields: ['id'] } },
  } as any)) as Row | null;
  const source = row ?? MENTOR_SETTINGS_SEED;
  return {
    enabled: Boolean(source.enabled),
    pilotGroupIds: ((row?.pilotGroups ?? []) as Row[]).map((g) => Number(g.id)),
    // Postgres returns decimals as strings.
    monthlyCapUsd: Number(source.monthlyCapUsd),
    perUserDailyLimit: Number(source.perUserDailyLimit),
    // Existing rows hold null, which reads as off.
    storeSharedAnswers: source.storeSharedAnswers === true,
  };
}
