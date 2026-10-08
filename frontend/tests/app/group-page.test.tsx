/** Group page filters per viewer but feeds the Progress tab the full group. */
import GroupDetailPage from "@/app/(groups)/g/[slug]/page";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getCachedEnrollmentsWithLessonIds,
  getCachedUser,
} from "@/lib/requests/cached";
import { getGroupBySlugV2, getGroupDueDates } from "@/lib/requests/groups";
import { getEnrollmentsForGroupMembers } from "@/lib/requests/enrollment";
import { getVoyageEnrollmentsForGroupMembers } from "@/lib/requests/voyage-enrollment";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
  getCachedEnrollmentsWithLessonIds: jest.fn(),
}));
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
jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
jest.mock("isomorphic-dompurify", () => ({ sanitize: (s: string) => s }));
jest.mock("@/components/group/member-list", () => ({ MemberList: () => null }));
jest.mock("@/components/group/content-section", () => ({
  ContentSection: () => null,
}));
jest.mock("@/components/group/group-header", () => ({
  GroupHeader: () => null,
}));
jest.mock("@/components/group/due-date-announcements", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/group/group-management-dashboard", () => ({
  GroupDashboard: () => null,
}));

const drop = (id: number, isHidden: boolean, status = "published") => ({
  id,
  name: `D${id}`,
  isHidden,
  status,
});

type Node = { type: unknown; props: Record<string, any> };

function findDashboard(node: any): Node | null {
  if (!node || typeof node !== "object") return null;
  if (node.type?.name === "GroupDashboard" || node.props?.progressGroup) {
    return node;
  }
  const kids = node.props?.children;
  for (const k of Array.isArray(kids) ? kids : [kids]) {
    const found = findDashboard(k);
    if (found) return found;
  }
  return null;
}

describe("GroupDetailPage", () => {
  const group = {
    id: 1,
    slug: "g",
    creator: { id: 9 },
    members: [{ id: 5, email: "m@x.edu" }],
    droplets: [drop(1, false), drop(2, true)],
    playlists: [],
    voyages: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue({
      email: "v@x.edu",
      roles: [],
    });
    (getGroupBySlugV2 as jest.Mock).mockResolvedValue(group);
    (getGroupDueDates as jest.Mock).mockResolvedValue([
      { dueDate: "2999-01-01", droplet: { id: 1 } },
      { dueDate: "2999-01-01", droplet: { id: 2 } },
    ]);
    (getEnrollmentsForGroupMembers as jest.Mock).mockResolvedValue([]);
    (getVoyageEnrollmentsForGroupMembers as jest.Mock).mockResolvedValue([]);
    (getCachedEnrollmentsWithLessonIds as jest.Mock).mockResolvedValue([]);
  });

  const render = async () => {
    const el = await GroupDetailPage({
      params: Promise.resolve({ slug: "g" }),
    });
    return findDashboard(el)!.props;
  };

  it("hides a hidden droplet from a non-enrolled viewer but keeps it in progressGroup", async () => {
    (getCachedUser as jest.Mock).mockResolvedValue({ id: 9 });

    const props = await render();

    expect(props.group.droplets.map((d: any) => d.id)).toEqual([1]);
    expect(props.progressGroup.droplets.map((d: any) => d.id)).toEqual([1, 2]);
    expect(props.dueDates.map((d: any) => d.droplet.id)).toEqual([1]);
    expect(getEnrollmentsForGroupMembers).toHaveBeenCalledWith([5], [1, 2]);
  });

  it("keeps a published-hidden droplet for an enrolled non-member", async () => {
    (getCachedUser as jest.Mock).mockResolvedValue({ id: 20 });
    (getCachedEnrollmentsWithLessonIds as jest.Mock).mockResolvedValue([
      { id: 1, droplet: { id: 2 } },
    ]);

    const props = await render();

    expect(props.group.droplets.map((d: any) => d.id)).toEqual([1, 2]);
  });

  it("uses the member enrollment rows already loaded for a member viewer", async () => {
    (getCachedUser as jest.Mock).mockResolvedValue({ id: 5 });
    (getEnrollmentsForGroupMembers as jest.Mock).mockResolvedValue([
      { id: 1, droplet: { id: 2 }, authorizedUser: { id: 5 } },
    ]);

    const props = await render();

    expect(getCachedEnrollmentsWithLessonIds).not.toHaveBeenCalled();
    expect(props.group.droplets.map((d: any) => d.id)).toEqual([1, 2]);
  });

  it("fails closed when the members fetch fails", async () => {
    (getCachedUser as jest.Mock).mockResolvedValue({ id: 5 });
    (getEnrollmentsForGroupMembers as jest.Mock).mockRejectedValue(
      new Error("boom"),
    );
    jest.spyOn(console, "error").mockImplementation(() => {});

    const props = await render();

    expect(props.group.droplets.map((d: any) => d.id)).toEqual([1]);
  });

  it("fails closed for a non-member when the viewer's enrollments fetch rejects", async () => {
    (getCachedUser as jest.Mock).mockResolvedValue({ id: 20 });
    (getCachedEnrollmentsWithLessonIds as jest.Mock).mockRejectedValue(
      new Error("boom"),
    );

    const props = await render();

    expect(getCachedEnrollmentsWithLessonIds).toHaveBeenCalledWith(20);
    expect(props.group.droplets.map((d: any) => d.id)).toEqual([1]);
    expect(props.dueDates.map((d: any) => d.droplet.id)).toEqual([1]);
  });

  it("keeps hidden droplets for staff", async () => {
    (getCachedUser as jest.Mock).mockResolvedValue({ id: 20 });
    (getCurrentUser as jest.Mock).mockResolvedValue({
      email: "v@x.edu",
      roles: [AuthorizedUserRoleTitle.ContentEditor],
    });

    const props = await render();

    expect(props.group.droplets.map((d: any) => d.id)).toEqual([1, 2]);
  });
});
