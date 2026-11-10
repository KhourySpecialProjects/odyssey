import { create } from "zustand";

export type LessonPanel = "notes" | "mentor" | null;

/** Which right-hand panel is open; shared by the header button and the lesson. */
type LessonPanelState = {
  panel: LessonPanel;
  // The lesson whose wrapper owns `panel`; others read it as closed.
  ownerLessonId: number | null;
  // True while a conversation exists, even when swapped out for Notes.
  mentorKept: boolean;
  mentorAvailable: boolean;
  setPanel: (panel: LessonPanel) => void;
  claim: (lessonId: number) => void;
  openMentor: () => void;
  closeMentor: () => void;
  setMentorAvailable: (available: boolean) => void;
  reset: () => void;
};

const INITIAL = {
  panel: null as LessonPanel,
  ownerLessonId: null as number | null,
  mentorKept: false,
  mentorAvailable: false,
};

export const useLessonPanelStore = create<LessonPanelState>()((set) => ({
  ...INITIAL,
  setPanel: (panel) => set({ panel }),
  claim: (ownerLessonId) => set({ ownerLessonId }),
  openMentor: () => set({ panel: "mentor", mentorKept: true }),
  closeMentor: () =>
    set((s) => ({
      panel: s.panel === "mentor" ? null : s.panel,
      mentorKept: false,
    })),
  setMentorAvailable: (mentorAvailable) => set({ mentorAvailable }),
  reset: () => set(INITIAL),
}));

/** The open panel for this lesson; a previous lesson's stale state reads as closed. */
export function useOwnedPanel(lessonId: number): LessonPanel {
  return useLessonPanelStore((s) =>
    s.ownerLessonId === lessonId ? s.panel : null,
  );
}

/** Whether this lesson has a conversation; another lesson's stale flag reads false. */
export function useOwnedMentorKept(lessonId: number): boolean {
  return useLessonPanelStore(
    (s) => s.ownerLessonId === lessonId && s.mentorKept,
  );
}
