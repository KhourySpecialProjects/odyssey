/**
 * Where a review comment points: part of one block's text, a whole block, or
 * a quote in a field. Saved with the comment, so it carries a version.
 */
export type Anchor = {
  v: 1;
  /** The content it's in: "blocks" for a lesson, or a field such as the Overview */
  field: string;
  /**
   * The BlockNote block id. Absent where blocks have no lasting ids:
   * Classic-editor lessons (new ids on every save) and plain fields.
   */
  blockId?: string;
  /** Offsets in the block's own text (or the field's). Absent for a whole block. */
  start?: number;
  end?: number;
  /** The text it covered, and up to 30 characters either side of it */
  quote?: string;
  prefix?: string;
  suffix?: string;
};

/** One block's own text (not its children's), with a line break as "\n" */
export type AnchorBlock = { id?: string; text: string };

/**
 * The current text, per field, that anchors are found in. A field whose
 * blocks have no lasting ids (a Classic-editor lesson, the Overview) is one
 * block with no id.
 */
export type AnchorContent = Record<string, AnchorBlock[]>;

/** Where an anchor is in the current content */
export type AnchorRange = {
  field: string;
  blockId?: string;
  start: number;
  end: number;
  /** False when the quoted text itself has changed since the comment */
  exact: boolean;
};

export const OUTDATED = "outdated";

/** How much text either side of a quote is kept, to find it again */
export const CONTEXT = 30;
