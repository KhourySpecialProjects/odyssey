import { canScan } from "@/lib/overview-scan/access";
import { AuthorizedUserRoleTitle as Role } from "@/lib/globals";

describe("canScan", () => {
  it.each([
    ["an author with the User role", [Role.User], true, true],
    ["an author with no roles", undefined, true, true],
    ["a non-author System Admin", [Role.SysAdmin], false, true],
    ["a non-author Faculty", [Role.Faculty], false, true],
    ["a non-author Content Editor", [Role.ContentEditor], false, true],
    ["a non-author Content Creator", [Role.ContentCreator], false, false],
    ["a non-author User", [Role.User], false, false],
    ["a non-author with no roles", undefined, false, false],
  ])("%s: %s", (_n, roles, isAuthor, expected) => {
    expect(canScan(roles, isAuthor)).toBe(expected);
  });
});
