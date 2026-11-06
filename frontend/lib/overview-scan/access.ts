import { AuthorizedUserRoleTitle } from "@/lib/globals";

// Scanning never writes the droplet, so staff who can't edit it may still scan.
// Who may scan (ODY-794); the sidebar link uses the same rule.
export const SCAN_BYPASS_ROLES: readonly AuthorizedUserRoleTitle[] = [
  AuthorizedUserRoleTitle.SysAdmin,
  AuthorizedUserRoleTitle.Faculty,
  AuthorizedUserRoleTitle.ContentEditor,
];

export function canScan(
  roles?: readonly string[],
  isAuthor?: boolean,
): boolean {
  return !!isAuthor || SCAN_BYPASS_ROLES.some((r) => roles?.includes(r));
}
