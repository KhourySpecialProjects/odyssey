import { render, screen } from "@testing-library/react";
import GroupDetailPage from "@/app/(groups)/g/[slug]/page";
import { GroupDashboard } from "@/components/group/group-management-dashboard";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { getGroupBySlugV2, getGroupDueDates } from "@/lib/requests/groups";
import { getEnrollmentsForGroupMembers } from "@/lib/requests/enrollment";
import { getVoyageEnrollmentsForGroupMembers } from "@/lib/requests/voyage-enrollment";
import { notFound } from "next/navigation";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/requests/cached", () => ({ getCachedUser: jest.fn() }));
jest.mock("@/lib/requests/groups", () => ({
  getGroupBySlugV2: jest.fn(),
  getGroupDueDates: jest.fn(),
}));
jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsForGroupMembers: jest.fn(),
}));
jest.mock("@/lib/requests/voyage-enrollment", () => ({
  getVoyageEnrollmentsForGroupMembers: jest.fn(),
}));

jest.mock("@/components/group/group-management-dashboard", () => ({
  GroupDashboard: jest.fn(() => null),
}));
jest.mock("@/components/group/member-list", () => ({
  MemberList: jest.fn(() => null),
}));
jest.mock("@/components/group/content-section", () => ({
  ContentSection: jest.fn(() => null),
}));
jest.mock("@/components/group/group-header", () => ({
  GroupHeader: jest.fn(() => null),
}));
jest.mock("@/components/group/due-date-announcements", () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
jest.mock("@/components/ui/separator", () => ({
  Separator: jest.fn(() => null),
}));
jest.mock("isomorphic-dompurify", () => ({
  __esModule: true,
  default: { sanitize: (s: string) => s },
}));

const member = (id: number, email: string) => ({
  id,
  email,
  firstName: `First${id}`,
  lastName: `Last${id}`,
});

const members = [member(10, "m10@northeastern.edu"), member(11, "m11@x.edu")];

const baseGroup = {
  id: 1,
  slug: "g-12345",
  groupName: "G",
  semester: "Fall 2026",
  description: "d",
  creator: member(1, "creator@x.edu"),
  admins: [member(2, "admin@x.edu")],
  managers: [member(3, "manager@x.edu")],
  members,
  droplets: [{ id: 100 }],
  playlists: [],
  voyages: [{ id: 200, voyage_nodes: [] }],
};

const enrollments = [
  {
    droplet: { id: 100, lessons: [{ id: 1 }, { id: 2 }] },
    authorizedUser: { id: 10 },
    viewedLessons: [{ id: 1 }],
    completionDate: undefined,
  },
];
const voyageEnrollments = [
  {
    authorizedUser: { id: 10 },
    voyage: { id: 200 },
    completionPercentage: 40,
  },
];

function signInAs(id: number, roles: string[] = []) {
  jest
    .mocked(getCurrentUser)
    .mockResolvedValue({ email: `u${id}@x.edu`, roles } as never);
  jest
    .mocked(getCachedUser)
    .mockResolvedValue({ id, email: `u${id}@x.edu` } as never);
}

async function renderPage() {
  const ui = await GroupDetailPage({
    params: Promise.resolve({ slug: "g-12345" }),
  });
  render(ui as React.ReactElement);
  return jest.mocked(GroupDashboard).mock.calls[0][0];
}

type DashboardProps = Awaited<ReturnType<typeof renderPage>>;

function expectNoProgressData(props: DashboardProps) {
  expect(getEnrollmentsForGroupMembers).not.toHaveBeenCalled();
  expect(getVoyageEnrollmentsForGroupMembers).not.toHaveBeenCalled();
  expect(props.statuses).toEqual({});
  expect(props.voyageStatuses).toEqual({});
  expect(props.group.members).toEqual([]);
  expect(JSON.stringify(props)).not.toContain("m10@northeastern.edu");
  expect(JSON.stringify(props)).not.toContain("m11@x.edu");
}

function expectFullProgressData(props: DashboardProps) {
  expect(getEnrollmentsForGroupMembers).toHaveBeenCalledWith([10, 11], [100]);
  expect(getVoyageEnrollmentsForGroupMembers).toHaveBeenCalledWith(
    [10, 11],
    [200],
  );
  expect(props.statuses["10-100"].completionPercentage).toBe(50);
  expect(props.voyageStatuses["10-200"]).toEqual({ completionPercentage: 40 });
  expect(props.group.members).toHaveLength(2);
  expect(screen.getByText("2")).toBeInTheDocument();
}

describe("Group detail page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getGroupBySlugV2).mockResolvedValue(baseGroup as never);
    jest.mocked(getGroupDueDates).mockResolvedValue([]);
    jest
      .mocked(getEnrollmentsForGroupMembers)
      .mockResolvedValue(enrollments as never);
    jest
      .mocked(getVoyageEnrollmentsForGroupMembers)
      .mockResolvedValue(voyageEnrollments as never);
  });

  it("returns notFound for a signed-in user unrelated to the group", async () => {
    signInAs(99);

    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
    expect(getGroupDueDates).not.toHaveBeenCalled();
    expect(getEnrollmentsForGroupMembers).not.toHaveBeenCalled();
    expect(getVoyageEnrollmentsForGroupMembers).not.toHaveBeenCalled();
  });

  it("gives a plain member the page without progress or member emails", async () => {
    signInAs(10);

    const props = await renderPage();

    expect(props.canEdit).toBe(false);
    expectNoProgressData(props);
    expect(screen.getByText("Total Members")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("treats a manager (not admin) like a member for data", async () => {
    signInAs(3);

    const props = await renderPage();

    expectNoProgressData(props);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("gives a group admin the progress data and members", async () => {
    signInAs(2);

    const props = await renderPage();

    expectFullProgressData(props);
  });

  it("gives the creator the progress data and members", async () => {
    signInAs(1);

    const props = await renderPage();

    expect(props.canEdit).toBe(true);
    expectFullProgressData(props);
  });

  it("lets a SysAdmin outside the group in with full data", async () => {
    signInAs(99, ["System Admin"]);

    const props = await renderPage();

    expect(props.canEdit).toBe(true);
    expectFullProgressData(props);
  });
});
