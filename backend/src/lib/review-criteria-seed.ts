// Starter rubric for reviews; seeded only into an empty review_criteria table (ODY-799).
const CRITERION_UID = 'api::review-criterion.review-criterion';

export const REVIEW_CRITERIA_SEED = [
  {
    name: 'Tone',
    order: 1,
    lessonDescription:
      'Is the lesson engaging? Does it speak to the learner, say why the topic matters, and use concrete examples?\n1: Flat and dry; reads like reference docs.\n5: Lively, consistent voice; the learner wants to keep going.',
    overallDescription:
      'Is the voice consistent from lesson to lesson?\n1: Flat and dry; reads like reference docs.\n5: Lively, consistent voice; the learner wants to keep going.',
  },
  {
    name: 'Style',
    order: 2,
    lessonDescription:
      'Is it easy to read on screen? Headings fit the structure, bold and italics are used sparingly and consistently, and text is broken into short paragraphs, lists and visuals.\n1: Walls of text; headings or emphasis everywhere, or none at all.\n5: Scannable; formatting helps rather than distracts.',
    overallDescription:
      'Is formatting consistent across lessons?\n1: Walls of text; headings or emphasis everywhere, or none at all.\n5: Scannable; formatting helps rather than distracts.',
  },
  {
    name: 'Flow',
    order: 3,
    lessonDescription:
      'Does the lesson follow one thread? One topic, each idea building on the one before, transitions between sections, an opening that says what the lesson is for, and a close that wraps it up.\n1: Jumps between unrelated topics; uses ideas before introducing them; ends abruptly.\n5: Reads as one connected explanation; every section leads into the next.',
    overallDescription:
      'Are the lessons in a sensible order, with links between them?\n1: Jumps between unrelated topics; uses ideas before introducing them; ends abruptly.\n5: Reads as one connected explanation; every section leads into the next.',
  },
  {
    name: 'Scaffolding',
    order: 4,
    lessonDescription:
      "Could a learner who has done the prerequisite droplets and this droplet's earlier lessons follow this lesson? Everything it relies on is explained here, taught in an earlier lesson, or covered by a prerequisite droplet. Difficulty climbs steadily and fits the droplet's difficulty setting. Lesson 1 is judged against the prerequisites alone. Relying on a later lesson counts against it; pointing ahead is fine.\n1: Relies on things never taught earlier or covered by a prerequisite, or on a later lesson; unexplained jargon; a sudden jump in difficulty.\n5: Nothing assumed that wasn't taught earlier, covered by a prerequisite, or explained here.",
    overallDescription:
      "Does difficulty climb steadily across the droplet, and do the prerequisites cover what Lesson 1 assumes?\n1: Relies on things never taught earlier or covered by a prerequisite, or on a later lesson; unexplained jargon; a sudden jump in difficulty.\n5: Nothing assumed that wasn't taught earlier, covered by a prerequisite, or explained here.",
  },
  {
    name: 'Quality',
    order: 5,
    lessonDescription:
      "Does the lesson use Odyssey's block types well for its own content, and give the learner a way to check what it taught (a quiz, an exercise or a check-in)?\n1: Text only, or blocks used for decoration; nothing to check understanding.\n5: Each block type earns its place; the learner can check what they learned here.",
    overallDescription:
      'Is every learning objective taught and checked somewhere in the droplet?\n1: Text only, or blocks used for decoration; nothing to check understanding.\n5: Each block type earns its place; the learner can check what they learned here.',
  },
];

// Returns the number created; 0 when the table already has any rows. All-or-nothing.
export async function seedReviewCriteria(): Promise<number> {
  return strapi.db.transaction(async () => {
    const documents = strapi.documents(CRITERION_UID);
    if ((await documents.count({})) > 0) return 0;

    for (const criterion of REVIEW_CRITERIA_SEED) {
      await documents.create({ data: { ...criterion, active: true } });
    }
    return REVIEW_CRITERIA_SEED.length;
  });
}
