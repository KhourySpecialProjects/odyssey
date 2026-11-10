import posthog from "posthog-js";
import { MENTOR_KINDS, type MentorKind } from "./types";

// Mentor's PostHog events (ODY-890): ids, enums, booleans and a UUID only, never text.

type Ids = { droplet_id: number; lesson_id: number };

export type MentorEvents = {
  mentor_opened: Ids;
  mentor_saved_to_notes: Ids;
  mentor_asked: Ids & { kind: MentorKind };
  mentor_source_clicked: Ids & { found: boolean };
  mentor_rated: Ids & {
    rating: "up" | "down";
    kind: MentorKind;
    answer_key: string;
    prompt_version: string;
  };
  mentor_explain_answer: Ids & { question_id: number };
  mentor_hint_next_try: Ids & { question_id: number; is_correct: boolean };
};

const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const bool = (v: unknown) => typeof v === "boolean";
const oneOf =
  (...allowed: string[]) =>
  (v: unknown) =>
    typeof v === "string" && allowed.includes(v);
const matches = (re: RegExp) => (v: unknown) =>
  typeof v === "string" && re.test(v);

type EventKey = {
  [E in keyof MentorEvents]: keyof MentorEvents[E];
}[keyof MentorEvents];

const CHECKS: Record<EventKey, (v: unknown) => boolean> = {
  droplet_id: num,
  lesson_id: num,
  question_id: num,
  found: bool,
  is_correct: bool,
  kind: oneOf(...MENTOR_KINDS),
  rating: oneOf("up", "down"),
  answer_key: matches(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ),
  prompt_version: matches(/^[\w.-]{1,40}$/),
};

const KEYS: { [E in keyof MentorEvents]: (keyof MentorEvents[E] & string)[] } =
  {
    mentor_opened: ["droplet_id", "lesson_id"],
    mentor_saved_to_notes: ["droplet_id", "lesson_id"],
    mentor_asked: ["droplet_id", "lesson_id", "kind"],
    mentor_source_clicked: ["droplet_id", "lesson_id", "found"],
    mentor_rated: [
      "droplet_id",
      "lesson_id",
      "rating",
      "kind",
      "answer_key",
      "prompt_version",
    ],
    mentor_explain_answer: ["droplet_id", "lesson_id", "question_id"],
    mentor_hint_next_try: [
      "droplet_id",
      "lesson_id",
      "question_id",
      "is_correct",
    ],
  };

/** Sends only the event's allowlisted keys whose values pass their check. Never throws. */
export function trackMentor<E extends keyof MentorEvents>(
  event: E,
  props: MentorEvents[E],
) {
  try {
    const source = props as Record<string, unknown>;
    const picked: Record<string, unknown> = {};
    for (const key of KEYS[event]) {
      if (CHECKS[key as EventKey](source[key])) picked[key] = source[key];
    }
    posthog.capture(event, picked);
  } catch {
    // Analytics must never break the sidebar
  }
}
