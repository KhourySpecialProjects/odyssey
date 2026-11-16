import type { Citation } from "./types";

// The sidebar's conversation, kept in client state only (ODY-887)

export type StudentMsg = {
  id: string;
  role: "student";
  text: string;
  /** Set when the student asked Mentor to explain this text from the lesson (ODY-889) */
  selection?: string;
};

export type MentorMsg = {
  id: string;
  role: "mentor";
  /** The student message this answers */
  askId: string;
  /** Set to "explain" for selection asks; absent means "lesson" */
  kind?: "lesson" | "explain";
  status: "streaming" | "done" | "stopped" | "error";
  /** Raw, with refs: show it through displayAnswer */
  text: string;
  citations: Citation[];
  truncated: boolean;
  error?: { message: string; retry: boolean };
};
