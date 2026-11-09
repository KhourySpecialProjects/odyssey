import { lessonAccess } from "@/lib/lesson-access";

const droplet = (over: Parameters<typeof lessonAccess>[0] = {}) => ({
  status: "published" as const,
  isHidden: false,
  lessons: [{ id: 1 }, { id: 2 }],
  ...over,
});

describe("lessonAccess", () => {
  it.each<[string, Parameters<typeof lessonAccess>[0], unknown]>([
    ["published, with the lesson", droplet(), { ok: true, mentor: true }],
    ["hidden", droplet({ isHidden: true }), { ok: true, mentor: false }],
    ["a draft", droplet({ status: "draft" }), { ok: true, mentor: false }],
    ["in edit", droplet({ status: "edit" }), { ok: true, mentor: false }],
    ["without the lesson", droplet({ lessons: [{ id: 3 }] }), { ok: false }],
    ["with no lessons read", droplet({ lessons: null }), { ok: false }],
  ])("%s", (_, d, expected) => {
    expect(lessonAccess(d, 2)).toEqual(expected);
  });
});
