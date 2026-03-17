"use client";

import { useCallback, useState } from "react";
import { debounce } from "lodash";
import { AuthorizedUser } from "@/types";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/admin/search-bar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input as TextInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BarChart2, Pencil, User2Icon, Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateUserInfo } from "@/lib/requests/authorized-user";
import { useFormStatus } from "react-dom";
import { SortButton } from "@/components/admin/sort-button";
import { FilterButton } from "@/components/admin/filter-button";
import { CreateUser } from "./create-user";

const ITEMS_PER_PAGE = 10;

// ——— Role display config ———
const ROLE_CONFIG: Record<
  AuthorizedUserRoleTitle,
  { label: string; className: string }
> = {
  [AuthorizedUserRoleTitle.SysAdmin]: {
    label: "Admin",
    className:
      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
  },
  [AuthorizedUserRoleTitle.Faculty]: {
    label: "Faculty",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  },
  [AuthorizedUserRoleTitle.ContentCreator]: {
    label: "Content Creator",
    className:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  },
  [AuthorizedUserRoleTitle.ContentEditor]: {
    label: "Content Editor",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  },
  [AuthorizedUserRoleTitle.User]: {
    label: "User",
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600",
  },
};

const DEFAULT_SORT = "name-asc";

const SORT_GROUPS = [
  {
    header: "Name",
    options: [
      { value: "name-asc", label: "A–Z" },
      { value: "name-desc", label: "Z–A" },
    ],
  },
  {
    header: "Email",
    options: [{ value: "email-asc", label: "A–Z" }],
  },
] as const;

const FILTER_ROLE_OPTIONS = [
  { value: AuthorizedUserRoleTitle.SysAdmin, label: "Admin" },
  { value: AuthorizedUserRoleTitle.Faculty, label: "Faculty" },
  { value: AuthorizedUserRoleTitle.ContentCreator, label: "Content Creator" },
  { value: AuthorizedUserRoleTitle.ContentEditor, label: "Content Editor" },
  { value: AuthorizedUserRoleTitle.User, label: "User" },
] as const;

// ——— Activity types ———
interface UserActivity {
  timestamp: string;
  type:
    | "enrollment"
    | "page_view"
    | "lesson_view"
    | "completion"
    | "rating"
    | "quiz";
  description: string;
  details?: {
    properties?: {
      $pathname?: string;
      pathname?: string;
      $current_url?: string;
    };
    source?: string;
  };
}

// ——— UserTableRow ———
function UserTableRow({ user: initialUser }: { user: AuthorizedUser }) {
  const [user, setUser] = useState(initialUser);
  const [editOpen, setEditOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Edit form state
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [bio, setBio] = useState(user.bio || "");
  const [selectedRoles, setSelectedRoles] = useState<AuthorizedUserRoleTitle[]>(
    user.roles.map((r) => r.title),
  );

  const roleOptions = [
    { value: AuthorizedUserRoleTitle.Faculty, label: "Faculty" },
    { value: AuthorizedUserRoleTitle.ContentCreator, label: "Content Creator" },
    { value: AuthorizedUserRoleTitle.ContentEditor, label: "Content Editor" },
    { value: AuthorizedUserRoleTitle.SysAdmin, label: "System Admin" },
  ] as const;

  const toggleRole = (role: AuthorizedUserRoleTitle) => {
    setSelectedRoles((current) =>
      current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role],
    );
  };

  const handleEditUser = async (formData: FormData) => {
    const result = await updateUserInfo(user.id, {
      first: formData.get("firstName") as string,
      last: formData.get("lastName") as string,
      bio: formData.get("bio") as string,
      roles: selectedRoles,
    });

    if (result.success) {
      setUser((prev) => ({
        ...prev,
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        bio: formData.get("bio") as string,
        roles: selectedRoles.map((title) => ({ id: 0, title })),
      }));
      toast.success("User updated successfully");
      setEditOpen(false);
    } else {
      toast.error("Failed to update user");
    }
  };

  const handleToggleEnabled = async () => {
    const next = !user.isEnabled;
    setUser((prev) => ({ ...prev, isEnabled: next }));
    await updateUserInfo(user.id, { isEnabled: next });
  };

  const handleViewActivity = async () => {
    setActivityOpen(true);
    setLoadingActivities(true);
    try {
      const response = await fetch(`/api/user-activity/${user.id}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch activity");
      setActivities(await response.json());
    } catch {
      toast.error("Failed to load user activity");
    } finally {
      setLoadingActivities(false);
    }
  };

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email;

  const initials =
    user.firstName && user.lastName
      ? user.firstName[0] + user.lastName[0]
      : null;

  return (
    <>
      <tr className="border-b border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
        {/* Name */}
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <Avatar variant="round" size="sm">
              <AvatarImage src={user.profilePhoto || undefined} />
              <AvatarFallback>
                {initials ?? <User2Icon className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-slate-900 dark:text-slate-100">
                {displayName}
                {!user.isEnabled && (
                  <span className="ml-1 text-sm font-normal text-slate-400">
                    (Disabled)
                  </span>
                )}
              </p>
              {user.firstName && user.lastName && (
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </td>

        {/* Roles */}
        <td className="px-6 py-4">
          <div className="flex flex-wrap gap-1.5">
            {user.roles.length === 0 ? (
              <span className="text-base text-slate-400">—</span>
            ) : (
              user.roles.map((role) => {
                const config = ROLE_CONFIG[role.title];
                return config ? (
                  <Badge
                    key={role.title}
                    variant="outline"
                    className={cn("text-sm font-medium", config.className)}
                  >
                    {config.label}
                  </Badge>
                ) : null;
              })
            )}
          </div>
        </td>

        {/* Actions */}
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleViewActivity}
              aria-label="view activity"
              className="h-8 w-8 p-0"
            >
              <BarChart2 className="h-4 w-4 text-sky-600" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditOpen(true)}
              aria-label="edit user"
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4 text-sky-600" />
            </Button>
          </div>
        </td>
      </tr>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="scale-75 sm:scale-100">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <form action={handleEditUser} className="space-y-3">
            <input type="hidden" name="id" value={user.id} />
            <TextInput
              name="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
            />
            <TextInput
              name="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
            />
            <Textarea
              name="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Bio"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Roles</label>
              <div className="space-y-2">
                {roleOptions.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-role-${role.value}`}
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                      className="border-sky-500 focus-visible:ring-sky-500 data-[state=checked]:border-sky-500 data-[state=checked]:bg-sky-500"
                    />
                    <label
                      htmlFor={`edit-role-${role.value}`}
                      className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {role.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <SaveButton />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={
                  user.isEnabled
                    ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                    : "border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400"
                }
                onClick={handleToggleEnabled}
              >
                {user.isEnabled ? "Disable Access" : "Enable Access"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Timeline — {user.firstName} {user.lastName}
            </DialogTitle>
            <DialogDescription>
              Chronological view of all website activity
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {loadingActivities ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
              </div>
            ) : activities.length === 0 ? (
              <p className="py-8 text-center text-slate-500">
                No activity recorded yet
              </p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity, index) => {
                  let pathname: string | null = null;
                  if (
                    activity.type === "page_view" &&
                    activity.details?.properties
                  ) {
                    const props = activity.details.properties;
                    pathname =
                      props.$pathname ||
                      props.pathname ||
                      (props.$current_url
                        ? new URL(props.$current_url, "https://example.com")
                            .pathname
                        : null);
                  }
                  const isCompletion = activity.type === "completion";
                  const isQuiz = activity.type === "quiz";

                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex gap-4 rounded-lg border p-3",
                        isCompletion
                          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                          : isQuiz
                            ? "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950"
                            : "border-slate-200 dark:border-slate-700",
                      )}
                    >
                      <div className="w-32 flex-shrink-0 text-xs text-slate-500">
                        {new Date(activity.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {activity.description}
                        </p>
                        {pathname && (
                          <p className="mt-0.5 font-mono text-xs text-slate-500">
                            {pathname}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" aria-disabled={pending}>
      Save Changes
    </Button>
  );
}

// ——— Main Client Component ———
export function UsersPageClient({ users }: { users: AuthorizedUser[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<AuthorizedUser[]>(users);

  // Active (committed) sort/filter
  const [activeSortBy, setActiveSortBy] = useState(DEFAULT_SORT);
  const [activeFilterRoles, setActiveFilterRoles] = useState<string[]>([]);

  // Draft (in-popout) sort/filter — only committed on Apply
  const [draftSortBy, setDraftSortBy] = useState(DEFAULT_SORT);
  const [draftFilterRoles, setDraftFilterRoles] = useState<string[]>([]);

  const applyFiltersAndSort = useCallback(
    (search: string, sort: string, roles: string[]) => {
      let result = [...users];

      if (search.trim()) {
        const q = search.toLowerCase();
        result = result.filter(
          (u) =>
            u.firstName?.toLowerCase().includes(q) ||
            u.lastName?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q),
        );
      }

      if (roles.length > 0) {
        result = result.filter((u) =>
          u.roles.some((r) => roles.includes(r.title)),
        );
      }

      if (sort === "name-asc") {
        result.sort((a, b) =>
          (a.lastName || a.email).localeCompare(b.lastName || b.email),
        );
      } else if (sort === "name-desc") {
        result.sort((a, b) =>
          (b.lastName || b.email).localeCompare(a.lastName || a.email),
        );
      } else if (sort === "email-asc") {
        result.sort((a, b) => a.email.localeCompare(b.email));
      }

      setFilteredUsers(result);
      setCurrentPage(1);
    },
    [users],
  );

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      applyFiltersAndSort(value, activeSortBy, activeFilterRoles);
    }, 400),
    [applyFiltersAndSort, activeSortBy, activeFilterRoles],
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleSortApply = () => {
    setActiveSortBy(draftSortBy);
    applyFiltersAndSort(searchTerm, draftSortBy, activeFilterRoles);
  };

  const handleSortReset = () => {
    setDraftSortBy(DEFAULT_SORT);
    setActiveSortBy(DEFAULT_SORT);
    applyFiltersAndSort(searchTerm, DEFAULT_SORT, activeFilterRoles);
  };

  const handleFilterApply = () => {
    setActiveFilterRoles(draftFilterRoles);
    applyFiltersAndSort(searchTerm, activeSortBy, draftFilterRoles);
  };

  const handleFilterReset = () => {
    setDraftFilterRoles([]);
    setActiveFilterRoles([]);
    applyFiltersAndSort(searchTerm, activeSortBy, []);
  };

  const toggleDraftFilterRole = (role: string) => {
    setDraftFilterRoles((current) =>
      current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role],
    );
  };

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageUsers = filteredUsers.slice(start, start + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Controls — search left, sort+filter+create right */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          placeholder="Search by name or email…"
          value={searchTerm}
          onChange={handleSearch}
          className="max-w-[560px]"
        />
        <div className="flex items-center gap-2">
          <SortButton onApply={handleSortApply} onReset={handleSortReset}>
            <div className="space-y-3">
              {SORT_GROUPS.map((group) => (
                <div key={group.header}>
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    {group.header}
                  </p>
                  <div className="space-y-1.5">
                    {group.options.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-center gap-2 text-sm text-[#344054]"
                      >
                        <input
                          type="radio"
                          name="sort-option"
                          value={opt.value}
                          checked={draftSortBy === opt.value}
                          onChange={() => setDraftSortBy(opt.value)}
                          className="accent-[#2D7597]"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SortButton>

          <FilterButton
            onApply={handleFilterApply}
            onReset={handleFilterReset}
            hasActiveFilters={activeFilterRoles.length > 0}
          >
            <div className="space-y-2">
              {FILTER_ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 text-sm text-[#344054]"
                >
                  <input
                    type="checkbox"
                    value={opt.value}
                    checked={draftFilterRoles.includes(opt.value)}
                    onChange={() => toggleDraftFilterRole(opt.value)}
                    className="accent-[#2D7597]"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </FilterButton>

          <CreateUser />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
        <table className="w-full text-base">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-4 text-left text-base font-semibold text-slate-700 dark:text-slate-300">
                Name
              </th>
              <th className="px-6 py-4 text-left text-base font-semibold text-slate-700 dark:text-slate-300">
                Roles
              </th>
              <th className="px-6 py-4 text-left text-base font-semibold text-slate-700 dark:text-slate-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900">
            {pageUsers.length > 0 ? (
              pageUsers.map((user) => (
                <UserTableRow key={user.id} user={user} />
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="grid grid-cols-3 items-center border-t border-slate-200 pt-3 dark:border-slate-700">
          {/* Previous — far left */}
          <div>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Previous
            </button>
          </div>

          {/* Page numbers — centre */}
          <div className="flex justify-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => {
                const isEllipsis =
                  totalPages > 5 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  (pageNum < currentPage - 1 || pageNum > currentPage + 1);
                const prevWasEllipsis =
                  totalPages > 5 &&
                  pageNum - 1 !== 1 &&
                  pageNum - 1 !== totalPages &&
                  (pageNum - 1 < currentPage - 1 ||
                    pageNum - 1 > currentPage + 1);

                if (isEllipsis) {
                  // Only render one ellipsis per gap
                  return prevWasEllipsis ? null : (
                    <span
                      key={`ellipsis-${pageNum}`}
                      className="flex items-end pb-0.5 text-slate-400"
                    >
                      …
                    </span>
                  );
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "h-8 min-w-8 rounded-md px-2 text-sm font-medium transition-colors",
                      pageNum === currentPage
                        ? "bg-[#2D7597] text-white"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                    )}
                  >
                    {pageNum}
                  </button>
                );
              },
            )}
          </div>

          {/* Next — far right */}
          <div className="flex justify-end">
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
