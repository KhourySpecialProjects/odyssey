import { lessonGate } from "@/lib/lesson-gate";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import type { Lesson } from "@/types";

const lessons = [
  { id: 1, orderIndex: 0 },
  { id: 2, orderIndex: 1 },
] as Lesson[];

const base = {
  lessonId: 2,
  lessons,
  enrollmentId: "5",
  completedLessonIds: [] as number[],
  author: false,
};

describe("lessonGate", () => {
  it.each([
    ["enrolled, previous lesson done", { completedLessonIds: [1] }, "open"],
    ["enrolled, first lesson", { lessonId: 1 }, "open"],
    ["enrolled, previous lesson not done", {}, "locked"],
    ["not enrolled", { enrollmentId: undefined }, "enroll"],
    [
      "admin, not enrolled",
      {
        enrollmentId: undefined,
        roles: [AuthorizedUserRoleTitle.SysAdmin],
      },
      "open",
    ],
    [
      "admin is never locked",
      { roles: [AuthorizedUserRoleTitle.SysAdmin] },
      "open",
    ],
    [
      "author is never locked",
      { author: true, enrollmentId: undefined },
      "open",
    ],
  ])("%s", (_name, overrides, expected) => {
    const { gate, previous } = lessonGate({ ...base, ...overrides });
    expect(gate).toBe(expected);
    expect(previous?.id).toBe(expected === "locked" ? 1 : undefined);
  });
});
