"use client";

import { useState, useTransition } from "react";
import type { AccessRequest } from "@/components/shared/access-manager/access-requests/access-requests";
import type { CreationRequest } from "@/types";
import { useAdminTableFilters } from "@/hooks/use-admin-table-filters";
import { COLLEGES } from "@/lib/globals";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/admin/search-bar";
import { SortButton } from "@/components/admin/sort-button";
import { FilterButton } from "@/components/admin/filter-button";
import {
  AdminTable,
  type AdminColumnDef,
} from "@/components/admin/admin-table";
import { SortRadioGroup } from "@/components/admin/sort-radio-group";
import { FilterCheckboxGroup } from "@/components/admin/filter-checkbox-group";
import { createAuthorizedUser } from "@/lib/requests/authorized-user";
import {
  deleteAccessRequest,
  approveCreationRequest,
  deleteCreationRequest,
} from "@/lib/actions";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { CreationRequestModal } from "@/components/shared/creation-request-manager/view-request";

// ——— Tab types ———
type Tab = "access" | "creators";

function collegeLabel(value: string): string {
  return (
    COLLEGES.find((c) => c.value.toLowerCase() === value.toLowerCase())
      ?.shortLabel ?? value
  );
}

const NAME_EMAIL_SORT_GROUPS = [
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

const COLLEGE_FILTER_OPTIONS = COLLEGES.map((c) => ({
  value: c.value,
  label: c.value,
}));

const ACCESS_COLUMNS: AdminColumnDef[] = [
  { label: "Name", width: "w-[25%]" },
  { label: "Email", width: "w-[35%]" },
  { label: "College", width: "w-[15%]" },
  { label: "Actions", width: "w-[25%]" },
];

const CREATOR_COLUMNS: AdminColumnDef[] = [
  { label: "Name", width: "w-[30%]" },
  { label: "Email", width: "w-[40%]" },
  { label: "Actions", width: "w-[30%]" },
];

function AcceptRejectButtons({
  onAccept,
  onReject,
  disabled,
}: {
  onAccept: () => void;
  onReject: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-[5px]">
      <button
        onClick={onAccept}
        disabled={disabled}
        className="inline-flex items-center gap-[6px] rounded-[16px] bg-[#ecfdf3] px-[10px] py-[4px] text-[14px] leading-[18px] font-medium text-[#14ba6d] transition-colors hover:bg-[#d1fae5] disabled:opacity-50"
      >
        <Check className="h-[10px] w-[10px]" strokeWidth={3} />
        Accept
      </button>
      <button
        onClick={onReject}
        disabled={disabled}
        className="inline-flex items-center gap-[6px] rounded-[16px] bg-[#fdf0f1] px-[10px] py-[4px] text-[14px] leading-[18px] font-medium text-[#de3b48] transition-colors hover:bg-[#fee2e2] disabled:opacity-50"
      >
        <X className="h-[10px] w-[10px]" strokeWidth={3} />
        Reject
      </button>
    </div>
  );
}

// ——— Access Request Row ———
function AccessRequestRow({ request }: { request: AccessRequest }) {
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", request.email);
      formData.append("isEnabled", "true");

      const result = await createAuthorizedUser(formData);

      if (result.ok) {
        toast.success("User is now authorized!");
        const deleteFormData = new FormData();
        deleteFormData.append("id", request.id);
        await deleteAccessRequest(deleteFormData);
      } else if (result["error"] === "This attribute must be unique") {
        toast.error("This user is already authorized!");
      } else {
        toast.error("Failed to approve request");
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", request.id);
      const result = await deleteAccessRequest(formData);
      if (result?.error) {
        toast.error("Failed to reject request");
      } else {
        toast.success("Request rejected");
      }
    });
  };

  const displayName =
    request.givenName && request.familyName
      ? `${request.givenName} ${request.familyName}`
      : request.email;

  return (
    <tr
      className={cn(
        "border-b border-[#eaecf0] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      {/* Name */}
      <td className="h-[56px] py-3 pr-6 pl-[30px]">
        <p className="truncate text-[16px] font-medium text-[#101828] dark:text-white">
          {displayName}
        </p>
      </td>

      {/* Email */}
      <td className="h-[56px] px-6 py-[11px]">
        <p className="truncate text-[16px] font-medium text-[#101828] dark:text-white">
          {request.email}
        </p>
      </td>

      {/* College */}
      <td className="h-[56px] px-6 py-[11px]">
        <Badge
          variant="outline"
          className="rounded-[16px] border-0 bg-[#f2f4f7] px-[9px] py-[4px] text-[14px] leading-[18px] font-medium text-[#60646c] dark:bg-slate-700 dark:text-slate-300"
        >
          {collegeLabel(request.college)}
        </Badge>
      </td>

      {/* Actions */}
      <td className="h-[56px] px-6 py-3">
        <AcceptRejectButtons
          onAccept={handleApprove}
          onReject={handleReject}
          disabled={isPending}
        />
      </td>
    </tr>
  );
}

// ——— Creation Request Row ———
function CreationRequestRow({ request }: { request: CreationRequest }) {
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);

  const handleApprove = () => {
    if (!request.id || !request.user?.id) {
      toast.error("Invalid request data");
      return;
    }
    startTransition(async () => {
      const result = await approveCreationRequest(
        request.id.toString(),
        request.user.id,
      );
      if (result.ok) {
        toast.success(
          `${request.user.firstName} ${request.user.lastName} is now a Content Creator!`,
        );
        setModalOpen(false);
      } else {
        toast.error(`Failed to approve: ${result.error}`);
      }
    });
  };

  const handleReject = () => {
    if (!request.id) {
      toast.error("Invalid request data");
      return;
    }
    startTransition(async () => {
      const result = await deleteCreationRequest(request.id.toString());
      if (result.ok) {
        toast.success("Request declined");
        setModalOpen(false);
      } else {
        toast.error(`Failed to decline: ${result.error}`);
      }
    });
  };

  const displayName =
    request.user?.firstName && request.user?.lastName
      ? `${request.user.firstName} ${request.user.lastName}`
      : request.user?.email ?? "Unknown";

  return (
    <>
      <tr
        className={cn(
          "border-b border-[#eaecf0] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50",
          isPending && "pointer-events-none opacity-50",
        )}
      >
        {/* Name */}
        <td className="h-[56px] py-3 pr-6 pl-[30px]">
          <button
            onClick={() => setModalOpen(true)}
            className="truncate text-[16px] font-medium text-[#101828] underline dark:text-white"
          >
            {displayName}
          </button>
        </td>

        {/* Email */}
        <td className="h-[56px] px-6 py-[11px]">
          <p className="truncate text-[16px] font-medium text-[#101828] dark:text-white">
            {request.user?.email ?? "—"}
          </p>
        </td>

        <td className="h-[56px] px-6 py-3">
          <AcceptRejectButtons
            onAccept={handleApprove}
            onReject={handleReject}
            disabled={isPending}
          />
        </td>
      </tr>

      <CreationRequestModal
        request={request}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

// ——— Access Requests Table ———
function AccessRequestsTable({
  accessRequests,
}: {
  accessRequests: AccessRequest[];
}) {
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems,
    searchTerm,
    handleSearch,
    draftSortBy,
    setDraftSortBy,
    handleSortApply,
    handleSortReset,
    draftFilters,
    toggleDraftFilter,
    handleFilterApply,
    handleFilterReset,
    hasActiveFilters,
  } = useAdminTableFilters<AccessRequest>({
    items: accessRequests,
    defaultSort: "name-asc",
    searchFn: (r, q) =>
      !!(
        r.givenName?.toLowerCase().includes(q) ||
        r.familyName?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q)
      ),
    sortFn: (items, sort) => {
      const sorted = [...items];
      if (sort === "name-asc") {
        sorted.sort((a, b) =>
          (a.familyName || a.email).localeCompare(b.familyName || b.email),
        );
      } else if (sort === "name-desc") {
        sorted.sort((a, b) =>
          (b.familyName || b.email).localeCompare(a.familyName || a.email),
        );
      } else if (sort === "email-asc") {
        sorted.sort((a, b) => a.email.localeCompare(b.email));
      }
      return sorted;
    },
    filterFn: (r, colleges) =>
      colleges.some((c) => c.toLowerCase() === r.college?.toLowerCase()),
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
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
              groups={NAME_EMAIL_SORT_GROUPS}
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
              options={COLLEGE_FILTER_OPTIONS}
              selected={draftFilters}
              onToggle={toggleDraftFilter}
            />
          </FilterButton>
        </div>
      </div>

      {/* Table */}
      <AdminTable
        columns={ACCESS_COLUMNS}
        isEmpty={pageItems.length === 0}
        emptyMessage="No access requests found."
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      >
        {pageItems.map((request) => (
          <AccessRequestRow key={request.id} request={request} />
        ))}
      </AdminTable>
    </div>
  );
}

// ——— Creation Requests Table ———
function CreationRequestsTable({
  creationRequests,
}: {
  creationRequests: CreationRequest[];
}) {
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems,
    searchTerm,
    handleSearch,
    draftSortBy,
    setDraftSortBy,
    handleSortApply,
    handleSortReset,
  } = useAdminTableFilters<CreationRequest>({
    items: creationRequests,
    defaultSort: "name-asc",
    searchFn: (r, q) =>
      !!(
        r.user?.firstName?.toLowerCase().includes(q) ||
        r.user?.lastName?.toLowerCase().includes(q) ||
        r.user?.email?.toLowerCase().includes(q)
      ),
    sortFn: (items, sort) => {
      const sorted = [...items];
      if (sort === "name-asc") {
        sorted.sort((a, b) =>
          (a.user?.lastName || a.user?.email || "").localeCompare(
            b.user?.lastName || b.user?.email || "",
          ),
        );
      } else if (sort === "name-desc") {
        sorted.sort((a, b) =>
          (b.user?.lastName || b.user?.email || "").localeCompare(
            a.user?.lastName || a.user?.email || "",
          ),
        );
      } else if (sort === "email-asc") {
        sorted.sort((a, b) =>
          (a.user?.email || "").localeCompare(b.user?.email || ""),
        );
      }
      return sorted;
    },
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
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
              groups={NAME_EMAIL_SORT_GROUPS}
              value={draftSortBy}
              onChange={setDraftSortBy}
            />
          </SortButton>
        </div>
      </div>

      {/* Table */}
      <AdminTable
        columns={CREATOR_COLUMNS}
        isEmpty={pageItems.length === 0}
        emptyMessage="No creation requests found."
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      >
        {pageItems.map((request) => (
          <CreationRequestRow key={request.id} request={request} />
        ))}
      </AdminTable>
    </div>
  );
}

// ——— Main Client Component ———
export function RequestsPageClient({
  accessRequests,
  creationRequests,
}: {
  accessRequests: AccessRequest[];
  creationRequests: CreationRequest[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("access");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="inline-flex h-[45px] items-center rounded-[97px] bg-[#fcfcfd] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] dark:bg-slate-800">
        {[
          { key: "access" as Tab, label: "Access Requests" },
          { key: "creators" as Tab, label: "Creators Request" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "h-[37px] rounded-[35px] px-5 text-[16px] font-semibold transition-colors",
              activeTab === tab.key
                ? "mx-1 bg-[#2D7597] text-white"
                : "text-[#202630] hover:text-[#2D7597] dark:text-slate-300",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "access" ? (
        <AccessRequestsTable accessRequests={accessRequests} />
      ) : (
        <CreationRequestsTable creationRequests={creationRequests} />
      )}
    </div>
  );
}
