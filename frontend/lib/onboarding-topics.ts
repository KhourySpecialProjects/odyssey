import type { FocusArea } from "@/lib/validations/onboarding";

export interface OnboardingTopic {
  documentId: string;
  name: string;
  area: FocusArea;
}

// Tag name (lowercase) to area; Figma names plus the live Git and Cybersecurity tags.
// Tags missing on prod are created by ODY-955.
const TOPIC_AREAS: Record<string, FocusArea> = {
  python: "technical",
  web: "technical",
  react: "technical",
  databases: "technical",
  "data science": "technical",
  "machine learning & ai": "technical",
  cloud: "technical",
  containerization: "technical",
  "git & version control": "technical",
  git: "technical",
  security: "technical",
  cybersecurity: "technical",
  ios: "technical",
  cad: "technical",
  interviews: "professional",
  resumes: "professional",
  networking: "professional",
  "career fairs": "professional",
  "product analysis": "professional",
  presenting: "professional",
  "academic planning": "personal",
  ethics: "personal",
  "time management": "personal",
};

/** Tags that have an area, in the order given; unmapped tags are left out. */
export function tagsToTopics(
  tags: { documentId: string; name: string }[],
): OnboardingTopic[] {
  return tags.flatMap(({ documentId, name }) => {
    const area = TOPIC_AREAS[name.trim().toLowerCase()];
    return area ? [{ documentId, name, area }] : [];
  });
}
