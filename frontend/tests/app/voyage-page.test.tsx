/** Voyage page unlinks droplet nodes the viewer can't open. */
import { renderToStaticMarkup } from "react-dom/server";
import VoyagePage from "@/app/(voyages)/v/[slug]/page";
import { getVoyageBySlug } from "@/lib/requests/voyage";
import {
  getCachedEnrollmentsWithLessonIds,
  getCachedVoyageEnrollment,
} from "@/lib/requests/cached";
import { getVoyageNodeCompletions } from "@/lib/requests/voyage-enrollment";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserId } from "@/lib/auth/current-user-id";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

jest.mock("@/lib/requests/voyage", () => ({ getVoyageBySlug: jest.fn() }));
jest.mock("@/lib/requests/cached", () => ({
  getCachedEnrollmentsWithLessonIds: jest.fn(),
  getCachedVoyageEnrollment: jest.fn(),
}));
jest.mock("@/lib/requests/voyage-enrollment", () => ({
  getVoyageNodeCompletions: jest.fn(),
}));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/auth/current-user-id", () => ({
  getAuthorizedUserId: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
jest.mock("@/components/voyages/voyage-tree-map", () => ({
  VoyageTreeMap: ({ nodes }: any) => (
    <div>
      {nodes.map((n: any) => (
        <span
          key={n.id}
          data-testid={`tree-${n.id}`}
          data-slug={n.slug ?? ""}
          data-unavailable={String(!!n.unavailable)}
        />
      ))}
    </div>
  ),
}));
jest.mock("@/components/voyages/voyage-enroll-button", () => ({
  VoyageEnrollButton: ({ firstIncompleteHref }: any) => (
    <span data-testid="continue" data-href={firstIncompleteHref ?? ""} />
  ),
}));
jest.mock("@/components/voyages/voyage-publish-button", () => ({
  VoyagePublishButton: () => null,
}));
jest.mock("@/components/voyages/voyage-progress-bar", () => ({
  VoyageProgressBar: () => null,
}));

const node = (droplet: object, claimStatus = "authored") => ({
  id: 10,
  label: "Node",
  nodeType: "droplet",
  isMainPath: true,
  branchType: "required",
  orderIndex: 0,
  claimStatus,
  droplet: { id: 5, name: "D", slug: "d-slug", ...droplet },
});

async function render(
  droplet: object,
  {
    userId = 1,
    roles = [] as AuthorizedUserRoleTitle[],
    enrolledIn = [] as number[],
    claimStatus = "authored",
  } = {},
) {
  (getVoyageBySlug as jest.Mock).mockResolvedValue({
    id: 1,
    slug: "v",
    name: "V",
    status: "published",
    voyage_nodes: [node(droplet, claimStatus)],
  });
  (getCurrentUser as jest.Mock).mockResolvedValue({ email: "a@x.edu", roles });
  (getAuthorizedUserId as jest.Mock).mockResolvedValue(userId);
  (getCachedVoyageEnrollment as jest.Mock).mockResolvedValue({ id: 1 });
  (getVoyageNodeCompletions as jest.Mock).mockResolvedValue([]);
  (getCachedEnrollmentsWithLessonIds as jest.Mock).mockResolvedValue(
    enrolledIn.map((id) => ({ id, droplet: { id } })),
  );
  const el = await VoyagePage({ params: Promise.resolve({ slug: "v" }) });
  return renderToStaticMarkup(el);
}

describe("VoyagePage droplet node links", () => {
  beforeEach(() => jest.clearAllMocks());

  const hidden = { isHidden: true, status: "published" };

  it("unlinks a hidden droplet for a plain user", async () => {
    const html = await render(hidden);

    expect(html).not.toContain("/d/d-slug");
    expect(html).toContain("Unavailable");
    expect(html).toContain('data-unavailable="true"');
    expect(html).toContain('data-slug=""');
  });

  it("keeps the link for an author", async () => {
    const html = await render({ ...hidden, authorized_users: [{ id: 1 }] });

    expect(html).toContain("/d/d-slug");
    expect(html).not.toContain("Unavailable");
  });

  it("keeps the link for a SysAdmin", async () => {
    const html = await render(hidden, {
      roles: [AuthorizedUserRoleTitle.SysAdmin],
    });

    expect(html).toContain("/d/d-slug");
  });

  it("keeps the link for a user enrolled in a published-but-hidden droplet", async () => {
    const html = await render(hidden, { enrolledIn: [5] });

    expect(html).toContain("/d/d-slug");
    expect(html).not.toContain("Unavailable");
  });

  it("unlinks a draft droplet for an enrolled non-author", async () => {
    const html = await render(
      { isHidden: false, status: "draft" },
      { enrolledIn: [5] },
    );

    expect(html).not.toContain("/d/d-slug");
    expect(html).toContain("Unavailable");
    expect(html).toContain('data-href=""');
  });

  it("keeps In Progress and no link for a claimed unopenable node", async () => {
    const html = await render(
      { isHidden: true, status: "draft" },
      { claimStatus: "claimed" },
    );

    expect(html).toContain("In Progress");
    expect(html).not.toContain("Unavailable");
    expect(html).not.toContain("/d/");
    expect(html).toContain('data-slug=""');
  });

  it("gives an unlinked journey row no hover styles", async () => {
    const html = await render(hidden);

    expect(html).not.toContain("hover:border-slate-300");
    expect(html).not.toContain("hover:shadow-sm");
  });

  it("keeps hover styles on a linked journey row", async () => {
    const html = await render({ ...hidden, authorized_users: [{ id: 1 }] });

    expect(html).toContain("hover:border-slate-300");
  });
});
