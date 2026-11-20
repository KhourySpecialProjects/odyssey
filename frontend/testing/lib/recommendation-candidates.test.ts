/** @jest-environment node */
import { getRankInput } from "@/lib/recommendations/candidates";
import { getCoCompletion } from "@/lib/recommendations/co-completion";
import { getDismissedDropletIds } from "@/lib/recommendations/dismissals";
import { getLearnerProfile } from "@/lib/learner-profile";
import { getDroplets } from "@/lib/requests/droplet";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { fetchAPI } from "@/lib/utils";
import { USER_POPULATES } from "@/lib/requests/user-populates";
import {
  enrollmentRow,
  playlistRow,
  voyageEnrollmentRow,
} from "../mocks/recommendations";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/requests/droplet", () => ({ getDroplets: jest.fn() }));
jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
}));
jest.mock("@/lib/learner-profile", () => ({ getLearnerProfile: jest.fn() }));
jest.mock("@/lib/recommendations/dismissals", () => ({
  getDismissedDropletIds: jest.fn(),
}));
jest.mock("@/lib/recommendations/co-completion", () => ({
  getCoCompletion: jest.fn(),
}));
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));

const droplets = jest.mocked(getDroplets);
const enrollments = jest.mocked(getEnrollmentsByAuthorizedUser);
const profile = jest.mocked(getLearnerProfile);
const dismissed = jest.mocked(getDismissedDropletIds);
const coCompletion = jest.mocked(getCoCompletion);
const api = fetchAPI as jest.Mock;

const fullPage = (from = 1) =>
  Array.from({ length: 1000 }, (_, i) => enrollmentRow(from + i));

let voyages: unknown;
let playlists: unknown;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  voyages = [voyageEnrollmentRow()];
  playlists = [playlistRow()];
  droplets.mockResolvedValue([]);
  enrollments.mockResolvedValue([]);
  profile.mockResolvedValue({
    id: 1,
    goal: null,
    interestNote: null,
    interests: [{ id: 1, name: "React", slug: "react" }],
    focusAreas: ["technical"],
  });
  dismissed.mockResolvedValue([]);
  coCompletion.mockResolvedValue({
    pairs: new Map(),
    completions: new Map(),
  });
  api.mockImplementation(async (path: string) =>
    path === "/voyage-enrollments" ? voyages : playlists,
  );
});

const apiCall = (path: string) => api.mock.calls.find(([p]) => p === path)![1];

it("passes pairs and completions through", async () => {
  const pairs = new Map([[1, [{ id: 2, count: 3 }]]]);
  const completions = new Map([[2, 4]]);
  coCompletion.mockResolvedValue({ pairs, completions });

  const input = await getRankInput(7, []);

  expect(input.coCompletion).toBe(pairs);
  expect(input.completions).toBe(completions);
});

it("reads live droplets once, with no exclusion ids and no per-user tag", async () => {
  await getRankInput(7, [3, 4]);

  expect(droplets).toHaveBeenCalledTimes(1);
  const args = droplets.mock.calls[0][0]!;
  expect(args).toMatchObject({
    filters: {
      $and: [
        { status: { $eq: "published" } },
        { isHidden: false },
        { lessons: { id: { $notNull: true } } },
      ],
    },
    populate: {
      authorized_users: USER_POPULATES.authorName,
      prerequisites: { fields: ["id"] },
    },
    pagination: { page: 1, pageSize: 1000 },
  });
  expect(JSON.stringify(args)).not.toMatch(/\$notIn|recommendations-7/);
});

it("reads voyages and playlists under the student's own tags", async () => {
  await getRankInput(7, []);

  const voyageCall = apiCall("/voyage-enrollments");
  expect(voyageCall.urlParams.filters).toEqual({
    authorizedUser: { id: { $eq: 7 } },
  });
  expect(voyageCall.urlParams.sort).toEqual(["enrolledAt:desc", "id:desc"]);
  expect(voyageCall.next).toEqual({
    tags: ["voyage-enrollments-7", "voyages", "playlists", "recommendations-7"],
    revalidate: 900,
  });
  const playlistCall = apiCall("/playlists");
  expect(playlistCall.urlParams.filters).toEqual({
    authorized_users: { id: { $eq: 7 } },
  });
  expect(playlistCall.next.tags).toEqual([
    "playlists",
    "enrollments-7",
    "recommendations-7",
  ]);
  expect(voyageCall).not.toHaveProperty("cache");
  expect(playlistCall).not.toHaveProperty("cache");
});

describe("normalisation", () => {
  it("counts finished as enrolled too, and archived as enrolled only", async () => {
    enrollments.mockResolvedValue([
      enrollmentRow(1, { isComplete: true, completionDate: "2026-01-02" }),
      enrollmentRow(2, { isArchived: true }),
    ] as never);

    const { student } = await getRankInput(7, []);

    expect([...student.enrolledIds]).toEqual([1, 2]);
    expect(student.finished).toEqual([
      { id: 1, name: "Droplet 1", at: Date.parse("2026-01-02") },
    ]);
  });

  it("builds voyage paths before playlist paths", async () => {
    const { student } = await getRankInput(7, []);

    expect(student.paths).toEqual([
      { rule: "next-in-voyage", name: "V", dropletIds: [10] },
      { rule: "next-in-playlist", name: "P", dropletIds: [20] },
    ]);
  });

  it.each([
    ["draft voyage", "voyages", [voyageEnrollmentRow({ status: "draft" })]],
    ["archived voyage", "voyages", [voyageEnrollmentRow({ isArchived: true })]],
    ["archived playlist", "playlists", [playlistRow({ isArchived: true })]],
    [
      "self-archived playlist",
      "playlists",
      [playlistRow({ users_archived: [{ id: 7 }] })],
    ],
  ])("gives no path for a %s", async (_label, which, rows) => {
    if (which === "voyages") {
      voyages = rows;
      playlists = [];
    } else {
      voyages = [];
      playlists = rows;
    }
    expect((await getRankInput(7, [])).student.paths).toEqual([]);
  });

  it("keeps only the id and name of each interest, and the focus areas", async () => {
    const { student } = await getRankInput(7, []);
    expect(student.interests).toEqual([{ id: 1, name: "React" }]);
    expect(student.focusAreas).toEqual(["technical"]);
  });

  it("gives empty interests and areas for a null profile", async () => {
    profile.mockResolvedValue(null);
    const { student } = await getRankInput(7, []);
    expect(student.interests).toEqual([]);
    expect(student.focusAreas).toEqual([]);
  });

  it("orders finished droplets newest first", async () => {
    enrollments.mockResolvedValue([
      enrollmentRow(1, { isComplete: true, completionDate: "2026-01-01" }),
      enrollmentRow(2, { isComplete: true, completionDate: "2026-02-01" }),
    ] as never);
    const { student } = await getRankInput(7, []);
    expect(student.finished.map((f) => f.id)).toEqual([2, 1]);
  });
});

describe("paging", () => {
  it.each([
    ["candidate", () => droplets],
    ["enrollment", () => enrollments],
  ])("reads every %s page until a short page", async (label, mock) => {
    (mock() as jest.Mock)
      .mockResolvedValueOnce(fullPage(1))
      .mockResolvedValueOnce([enrollmentRow(1001)]);

    const { candidates, student } = await getRankInput(7, []);

    const calls = (mock() as jest.Mock).mock.calls;
    const pages = calls.map((c) => c.at(-1).pagination);
    expect(pages).toEqual([
      { page: 1, pageSize: 1000 },
      { page: 2, pageSize: 1000 },
    ]);
    expect(
      label === "candidate" ? candidates.length : student.enrolledIds.size,
    ).toBe(1001);
  });

  it("rejects rather than cut a list off after 20 full pages", async () => {
    enrollments.mockResolvedValue(fullPage() as never);
    await expect(getRankInput(7, [])).rejects.toThrow(RangeError);
    expect(enrollments).toHaveBeenCalledTimes(20);
  });
});

describe("failures", () => {
  it.each([
    ["candidates", () => droplets.mockRejectedValue(new Error("x"))],
    ["enrollments", () => enrollments.mockRejectedValue(new Error("x"))],
    ["dismissals", () => dismissed.mockRejectedValue(new Error("x"))],
  ])("a failed %s read rejects", async (_label, fail) => {
    fail();
    await expect(getRankInput(7, [])).rejects.toThrow();
  });

  it("a failed co-completion read falls back to empty maps, logging only the error name", async () => {
    coCompletion.mockRejectedValue(
      new TypeError("http://strapi/co-completions"),
    );

    const {
      coCompletion: pairs,
      completions,
      student,
    } = await getRankInput(7, []);

    expect(pairs).toEqual(new Map());
    expect(completions).toEqual(new Map());
    expect(student.interests).toEqual([{ id: 1, name: "React" }]);
    expect(console.error).toHaveBeenCalledWith(
      "recommendations: co-completion read failed:",
      "TypeError",
    );
  });

  it.each([
    ["voyages", ["next-in-playlist"]],
    ["playlists", ["next-in-voyage"]],
    ["profile", ["next-in-voyage", "next-in-playlist"]],
  ])("a failed %s read falls back to empty", async (label, rules) => {
    const boom = new TypeError("http://strapi/users/7");
    api.mockImplementation(async (path: string) => {
      if (label === "voyages" && path === "/voyage-enrollments") throw boom;
      if (label === "playlists" && path === "/playlists") throw boom;
      return path === "/voyage-enrollments" ? voyages : playlists;
    });
    if (label === "profile") profile.mockRejectedValue(boom);

    const { student } = await getRankInput(7, []);

    expect(student.paths.map((p) => p.rule)).toEqual(rules);
    expect(student.interests).toEqual(
      label === "profile" ? [] : [{ id: 1, name: "React" }],
    );
    expect(console.error).toHaveBeenCalledWith(
      `recommendations: ${label} read failed:`,
      "TypeError",
    );
    expect(JSON.stringify((console.error as jest.Mock).mock.calls)).not.toMatch(
      /7|http/,
    );
  });
});
