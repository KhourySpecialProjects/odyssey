"use client";

import { useState } from "react";
import { AuthorizedUser } from "@/types";
import { useAdminTableFilters } from "@/hooks/use-admin-table-filters";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/admin/search-bar";
import { Button } from "@/components/ui/button";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconChartBar, IconPencil, IconUser, IconActivity, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { updateUserInfo } from "@/lib/requests/authorized-user";
import { useFormStatus } from "react-dom";
import { SortButton } from "@/components/admin/sort-button";
import { FilterButton } from "@/components/admin/filter-button";
import {
  AdminTable,
  type AdminColumnDef,
} from "@/components/admin/admin-table";
import { SortRadioGroup } from "@/components/admin/sort-radio-group";
import { FilterCheckboxGroup } from "@/components/admin/filter-checkbox-group";
import { CreateUser } from "./create-user";

const USER_COLUMNS: AdminColumnDef[] = [
  { label: "Name", width: "w-[45%]" },
  { label: "Roles", width: "w-[40%]" },
  { label: "Actions", width: "w-[15%]" },
];

// ——— Role display config ———
const ROLE_CONFIG: Record<
  AuthorizedUserRoleTitle,
  { label: string; className: string }
> = {
  [AuthorizedUserRoleTitle.SysAdmin]: {
    label: "Admin",
    className: "bg-[#fef9ef] text-[#af5b42] border-0",
  },
  [AuthorizedUserRoleTitle.Faculty]: {
    label: "Faculty",
    className: "bg-[#eff6ff] text-[#2865bb] border-0",
  },
  [AuthorizedUserRoleTitle.ContentCreator]: {
    label: "Content Creator",
    className: "bg-[#f4ffe6] text-[#567f12] border-0",
  },
  [AuthorizedUserRoleTitle.ContentEditor]: {
    label: "Content Editor",
    className: "bg-[#ecffff] text-[#347d8f] border-0",
  },
  [AuthorizedUserRoleTitle.User]: {
    label: "User",
    className: "bg-[#fbf7ff] text-[#8a41c3] border-0",
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

  const initial = user.firstName ? user.firstName[0] : null;

  return (
    <>
      <tr className="border-b border-[#eaecf0] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
        {/* Name */}
        <td className="h-[56px] py-3 pr-6 pl-[30px]">
          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar variant="round" size="sm" className="shrink-0">
              <AvatarImage src={user.profilePhoto || undefined} />
              <AvatarFallback>
                {initial ?? <IconUser className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <p className="truncate text-[16px] font-medium text-[#101828] underline dark:text-white">
              {displayName}
              {!user.isEnabled && (
                <span className="ml-1 text-sm font-normal text-slate-400 no-underline">
                  (Disabled)
                </span>
              )}
            </p>
          </div>
        </td>

        {/* Roles */}
        <td className="h-[56px] px-6 py-[11px]">
          <div className="flex flex-wrap gap-[5px]">
            {user.roles.length === 0 ? (
              <span className="text-sm text-slate-400">—</span>
            ) : (
              user.roles.map((role) => {
                const config = ROLE_CONFIG[role.title];
                return config ? (
                  <Badge
                    key={role.title}
                    variant="outline"
                    className={cn(
                      "rounded-[16px] px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
                      config.className,
                    )}
                  >
                    {config.label}
                  </Badge>
                ) : null;
              })
            )}
          </div>
        </td>

        {/* Actions */}
        <td className="h-[56px] px-6 py-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleViewActivity}
              aria-label="view activity"
              className="h-8 w-8 p-0"
            >
              <IconChartBar className="h-4 w-4 text-sky-600" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditOpen(true)}
              aria-label="edit user"
              className="h-8 w-8 p-0"
            >
              <IconPencil className="h-4 w-4 text-sky-600" />
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
              <IconActivity className="h-5 w-5" />
              Activity Timeline — {user.firstName} {user.lastName}
            </DialogTitle>
            <DialogDescription>
              Chronological view of all website activity
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {loadingActivities ? (
              <div className="flex items-center justify-center py-8">
                <IconLoader2 className="h-8 w-8 animate-spin text-sky-600" />
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
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems: pageUsers,
    searchTerm,
    handleSearch,
    draftSortBy,
    setDraftSortBy,
    handleSortApply,
    handleSortReset,
    draftFilters: draftFilterRoles,
    toggleDraftFilter: toggleDraftFilterRole,
    handleFilterApply,
    handleFilterReset,
    hasActiveFilters,
  } = useAdminTableFilters<AuthorizedUser>({
    items: users,
    defaultSort: DEFAULT_SORT,
    searchFn: (u, q) =>
      !!(
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      ),
    sortFn: (items, sort) => {
      const sorted = [...items];
      if (sort === "name-asc") {
        sorted.sort((a, b) =>
          (a.lastName || a.email).localeCompare(b.lastName || b.email),
        );
      } else if (sort === "name-desc") {
        sorted.sort((a, b) =>
          (b.lastName || b.email).localeCompare(a.lastName || a.email),
        );
      } else if (sort === "email-asc") {
        sorted.sort((a, b) => a.email.localeCompare(b.email));
      }
      return sorted;
    },
    filterFn: (u, roles) => u.roles.some((r) => roles.includes(r.title)),
  });

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
            <SortRadioGroup
              groups={SORT_GROUPS}
              value={draftSortBy}
              onChange={setDraftSortBy}
            />
          </SortButton>

          <FilterButton
            onApply={handleFilterApply}
            onReset={handleFilterReset}
            hasActiveFilters={hasActiveFilters}
          >
            <FilterCheckboxGroup
              options={FILTER_ROLE_OPTIONS}
              selected={draftFilterRoles}
              onToggle={toggleDraftFilterRole}
            />
          </FilterButton>

          <CreateUser />
        </div>
      </div>

      <AdminTable
        columns={USER_COLUMNS}
        isEmpty={pageUsers.length === 0}
        emptyMessage="No users found."
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      >
        {pageUsers.map((user) => (
          <UserTableRow key={user.id} user={user} />
        ))}
      </AdminTable>
    </div>
  );
}
