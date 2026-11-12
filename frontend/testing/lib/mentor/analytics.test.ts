import posthog from "posthog-js";
import { trackMentor, type MentorEvents } from "@/lib/mentor/analytics";

const capture = jest.mocked(posthog.capture);
const UUID = "7b1f0c2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b";
const base = { droplet_id: 3, lesson_id: 4 };

beforeEach(() => jest.clearAllMocks());

describe("trackMentor", () => {
  it.each([
    ["mentor_opened", base],
    ["mentor_saved_to_notes", base],
    ["mentor_asked", { ...base, kind: "lesson" }],
    ["mentor_source_clicked", { ...base, found: false }],
    [
      "mentor_rated",
      {
        ...base,
        rating: "up",
        kind: "explain",
        answer_key: UUID,
        prompt_version: "2026-11-06.4",
      },
    ],
    ["mentor_explain_answer", { ...base, question_id: 9 }],
    ["mentor_hint_next_try", { ...base, question_id: 9, is_correct: true }],
  ] as const)("%s sends exactly its keys", (event, props) => {
    trackMentor(event, props as never);

    expect(capture).toHaveBeenCalledWith(event, props);
  });

  it("drops extra keys and values of the wrong shape", () => {
    trackMentor("mentor_rated", {
      ...base,
      text: "SENTINEL",
      lesson_id: "4",
      rating: "up",
      kind: "lesson",
      answer_key: "not a uuid SENTINEL",
      prompt_version: "has spaces",
    } as unknown as MentorEvents["mentor_rated"]);

    expect(capture).toHaveBeenCalledWith("mentor_rated", {
      droplet_id: 3,
      rating: "up",
      kind: "lesson",
    });
  });

  it("never throws", () => {
    capture.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    expect(() => trackMentor("mentor_opened", base)).not.toThrow();
  });
});
