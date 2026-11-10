/**
 * Anchors pin a review comment to text that may be edited afterwards
 * (ODY-801, for ODY-798). An anchor is made from a selection or a whole block
 * with createAnchor, saved with the comment, and found again in the current
 * content with resolveAnchor, which says "outdated" rather than dropping it.
 *
 * Lessons anchor to a BlockNote block's real id and offsets in that block's
 * own text, so editing other blocks doesn't move them. Classic-editor lessons
 * and the Overview have no lasting block ids, so they anchor by quote.
 *
 * Learner highlights don't use this yet, and the module holds no learner
 * state.
 *
 * Why not BlockNote's own comments: in 0.41 they keep their positions as
 * marks that the saved JSON (blocksV2) leaves out (`blocknoteIgnore`), so
 * they'd be lost on every save without a Yjs document, and they can't cover
 * Classic-editor lessons or the Overview.
 */
export * from "./types";
export { createAnchor, pointAnchor } from "./create";
export { resolveAnchor } from "./resolve";
export { blockNoteContent, htmlContent } from "./content";
export { drawAnchor, removeAnchor } from "./draw";
export {
  anchorDecorations,
  anchorsPlugin,
  refreshAnchors,
  type AnchorsDoc,
  type DrawnAnchor,
} from "./editor";
