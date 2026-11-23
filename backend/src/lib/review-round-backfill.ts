// Sets droplets already in review to round 1 (ODY-802); a no-op once caught up.
const DROPLET_UID = 'api::droplet.droplet';

export async function backfillReviewRounds(): Promise<number> {
  const result = await strapi.db.transaction(() =>
    strapi.db.query(DROPLET_UID).updateMany({
      where: {
        inReview: true,
        $or: [{ reviewRound: { $null: true } }, { reviewRound: { $lt: 1 } }],
      },
      data: { reviewRound: 1 },
    })
  );
  return result.count;
}
