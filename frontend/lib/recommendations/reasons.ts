import type { FocusArea } from "@/types";

const FOCUS_LABELS: Record<FocusArea, string> = {
  personal: "Personal",
  professional: "Professional",
  technical: "Technical",
};

/** Display copy for every rule's reason line. Consumers never compare it. */
export const REASONS = {
  voyage: (name: string) => `Next in your voyage: ${name}`,
  playlist: (name: string) => `Next in your playlist: ${name}`,
  postrequisite: (name: string) => `Builds on ${name}`,
  coCompletion: (name: string) => `Popular with students who finished ${name}`,
  interest: (name: string) => `Matches your interest: ${name}`,
  focus: (area: FocusArea) => `Matches your focus: ${FOCUS_LABELS[area]}`,
  topRated: "Top rated on Odyssey",
  unrated: "Something new to try",
};
