import {
  REVIEW_FROZEN_ERROR,
  REVIEW_FROZEN_MESSAGE,
  isFrozenFor,
  isReviewerFor,
} from "@/lib/review-roles";
import { AuthorizedUserRoleTitle as Role } from "@/lib/globals";

const roleSets: [string, Role[]][] = [
  ["SysAdmin", [Role.SysAdmin]],
  ["Faculty", [Role.Faculty]],
  ["Content Editor", [Role.ContentEditor]],
  ["Content Creator", [Role.ContentCreator]],
  ["User", [Role.User]],
  ["Editor+Creator", [Role.ContentEditor, Role.ContentCreator]],
  ["none", []],
];

// ODY-798 (2026-10-26): reviewers are System Admin and Content Editor.
// Faculty skip the manual review and publish only their own droplets.
const reviewerRoles = [Role.SysAdmin, Role.ContentEditor];
const hasReviewerRole = (roles: Role[]) =>
  roles.some((r) => reviewerRoles.includes(r));
const canPublishDirectly = (roles: Role[], isAuthor: boolean) =>
  roles.includes(Role.SysAdmin) || (roles.includes(Role.Faculty) && isAuthor);

describe("review-roles", () => {
  it("exposes the error code and message", () => {
    expect(REVIEW_FROZEN_ERROR).toBe("in_review");
    expect(REVIEW_FROZEN_MESSAGE).toBe(
      "In review. Editing is paused until the reviewer sends it back.",
    );
  });

  describe.each(roleSets)("roles: %s", (_name, roles) => {
    it.each([
      [true, true],
      [true, false],
      [false, true],
      [false, false],
      [null, true],
      [null, false],
      [undefined, false],
    ] as const)("inReview=%s isAuthor=%s", (inReview, isAuthor) => {
      const expectedReviewer = inReview
        ? !isAuthor && hasReviewerRole(roles)
        : canPublishDirectly(roles, isAuthor);
      expect(isReviewerFor(roles, inReview, isAuthor)).toBe(expectedReviewer);
      expect(isFrozenFor(roles, inReview, isAuthor)).toBe(
        !!inReview && !isReviewerFor(roles, true, isAuthor),
      );
    });
  });

  it("Editor-author in review is frozen and not a reviewer", () => {
    expect(isReviewerFor([Role.ContentEditor], true, true)).toBe(false);
    expect(isFrozenFor([Role.ContentEditor], true, true)).toBe(true);
  });

  it("Faculty-author in review is frozen and not a reviewer", () => {
    expect(isReviewerFor([Role.Faculty], true, true)).toBe(false);
    expect(isFrozenFor([Role.Faculty], true, true)).toBe(true);
  });

  it("SysAdmin-author in review is frozen and not a reviewer", () => {
    expect(isReviewerFor([Role.SysAdmin], true, true)).toBe(false);
    expect(isFrozenFor([Role.SysAdmin], true, true)).toBe(true);
  });

  it("Faculty and SysAdmin authors not in review are reviewers (direct publish)", () => {
    expect(isReviewerFor([Role.Faculty], false, true)).toBe(true);
    expect(isReviewerFor([Role.SysAdmin], false, true)).toBe(true);
  });

  it("Faculty never review or publish someone else's droplet", () => {
    expect(isReviewerFor([Role.Faculty], true, false)).toBe(false);
    expect(isReviewerFor([Role.Faculty], false, false)).toBe(false);
    expect(isFrozenFor([Role.Faculty], true, false)).toBe(true);
  });

  it("handles missing arguments", () => {
    expect(isReviewerFor()).toBe(false);
    expect(isFrozenFor()).toBe(false);
  });

  it("a non-author Editor is a reviewer in review but not outside it", () => {
    expect(isReviewerFor([Role.ContentEditor], true, false)).toBe(true);
    expect(isReviewerFor([Role.ContentEditor], false, false)).toBe(false);
  });
});
