"use client";

import { useRef, useState } from "react";
import { Group } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Archive, ArchiveRestore, UsersIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { archiveGroup, setGroupArchivedForMe } from "@/lib/requests/groups";
import { GroupArchiveState } from "@/lib/group-archive";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type GroupCardProps = {
  group: Group;
  role: "creator" | "admin" | "manager" | "member";
  roleColors?: Record<string, string>;
  archiveState?: GroupArchiveState;
};

/**
 * Stops a synthetic event from reaching the card's wrapping `<Link>`. Radix
 * portals (DropdownMenu, AlertDialog) render outside the anchor in the DOM,
 * but React synthetic events still bubble through the React tree, so every
 * interactive control here needs this guard. (ODY-494 Design Decision 7)
 *
 * Only stops propagation — never calls `preventDefault()`. Radix's own
 * click handlers (e.g. `AlertDialogCancel`'s close, `DropdownMenu`'s open
 * toggle) are composed with ours via `composeEventHandlers`, which skips
 * Radix's default behavior whenever `event.defaultPrevented` is true. A
 * `preventDefault()` here would silently break those controls. Use this for
 * portalled Radix content (menu content/items, dialog buttons), which sits
 * outside the anchor in the DOM so only synthetic bubbling matters.
 */
function stopLinkNavigation(e: { stopPropagation(): void }) {
  e.stopPropagation();
}

/**
 * For buttons rendered *inside* the card's `<a>` in the DOM. Stopping
 * propagation keeps the click away from Next's `Link` handler, but the
 * anchor's native activation would still navigate (full page load) unless the
 * default is prevented too. Safe on the DropdownMenuTrigger because Radix
 * opens it on pointerdown/keydown, not click.
 */
function blockLinkActivation(e: {
  preventDefault(): void;
  stopPropagation(): void;
}) {
  e.preventDefault();
  e.stopPropagation();
}

type ConfirmDialog = "archive-all" | "unarchive-all" | null;

function GroupArchiveControls({
  group,
  archiveState,
}: {
  group: Group;
  archiveState: GroupArchiveState;
}) {
  const [isPending, setIsPending] = useState(false);
  // Synchronous in-flight guard, same pattern as RefreshGroupsButton
  // (ODY-484 Design Decision 5/6): aria-disabled is presentational only, so
  // repeat clicks are actually blocked with this ref instead of `disabled`,
  // which would drop keyboard focus.
  const isPendingRef = useRef(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null);
  // Neither AlertDialog below has an AlertDialogTrigger (they're opened from
  // a DropdownMenuItem or from a plain Button, not directly), so Radix has
  // no trigger element to return focus to on close and would otherwise drop
  // focus to <body>. These refs let onCloseAutoFocus send focus back to the
  // control that opened each dialog.
  const archiveMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const unarchiveAllTriggerRef = useRef<HTMLButtonElement>(null);

  async function runAction(
    action: () => Promise<{ success: boolean; error?: unknown }>,
    successMessage: string,
  ) {
    if (isPendingRef.current) return;
    isPendingRef.current = true;
    setIsPending(true);
    try {
      const result = await action();
      if (result.success) {
        toast.success(successMessage);
      } else {
        toast.error(`Couldn't update ${group.groupName}. Please try again.`);
      }
    } catch {
      toast.error(`Couldn't update ${group.groupName}. Please try again.`);
    } finally {
      isPendingRef.current = false;
      setIsPending(false);
    }
  }

  const archiveForMe = () =>
    runAction(
      () => setGroupArchivedForMe(group.id, true),
      `${group.groupName} archived. Find it in the Archived tab.`,
    );

  const unarchiveForMe = () =>
    runAction(
      () => setGroupArchivedForMe(group.id, false),
      `${group.groupName} unarchived.`,
    );

  const archiveForAll = () =>
    runAction(
      () => archiveGroup(group, true),
      `${group.groupName} archived for all members.`,
    );

  const unarchiveForAll = () =>
    runAction(
      () => archiveGroup(group, false),
      `${group.groupName} restored for all members.`,
    );

  // Outline + explicit purple text so labels stay readable against the card's
  // slate-50/slate-800 background (the default variant's white text blended in).
  const buttonClassName =
    "border-purple-300 bg-white text-purple-700 hover:bg-purple-50 hover:text-purple-800 dark:border-purple-400/60 dark:bg-slate-900 dark:text-purple-300 dark:hover:bg-slate-700 dark:hover:text-purple-200 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

  // Active tabs (member/admin/manager/creator): every card gets an archive
  // control.
  if (!archiveState.isEffectivelyArchived) {
    if (!archiveState.canManage) {
      return (
        <Button
          variant="outline"
          size="sm"
          aria-label="Archive group"
          aria-busy={isPending}
          aria-disabled={isPending}
          className={buttonClassName}
          onClick={(e) => {
            blockLinkActivation(e);
            archiveForMe();
          }}
        >
          <Archive className="text-purple-500" />
        </Button>
      );
    }

    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={archiveMenuTriggerRef}
              variant="outline"
              size="sm"
              aria-label="Archive options"
              aria-busy={isPending}
              aria-disabled={isPending}
              className={buttonClassName}
              onClick={blockLinkActivation}
            >
              <Archive className="text-purple-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={stopLinkNavigation}>
            {/*
              onSelect fires on a Radix-internal CustomEvent, not the click
              itself — calling preventDefault/stopPropagation on it would
              keep the menu open (Radix's documented way to cancel a
              select) rather than stop Link navigation. The underlying
              click already bubbles up to DropdownMenuContent's onClick
              above, which is where Link navigation is actually blocked.
            */}
            <DropdownMenuItem onSelect={archiveForMe}>
              Archive for me
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                if (isPendingRef.current) return;
                setConfirmDialog("archive-all");
              }}
            >
              Archive for all members
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog
          open={confirmDialog === "archive-all"}
          onOpenChange={(open) => !open && setConfirmDialog(null)}
        >
          <AlertDialogContent
            onClick={stopLinkNavigation}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              archiveMenuTriggerRef.current?.focus();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Archive for all members?</AlertDialogTitle>
              <AlertDialogDescription>
                This hides {group.groupName} for every member. Any group admin
                can undo this from the Archived tab.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={stopLinkNavigation}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  stopLinkNavigation(e);
                  setConfirmDialog(null);
                  archiveForAll();
                }}
              >
                Archive for all members
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Archived tab.
  if (archiveState.archivedForEveryone) {
    if (!archiveState.canManage) {
      return (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Archived by a group admin
        </span>
      );
    }

    return (
      <>
        <Button
          ref={unarchiveAllTriggerRef}
          variant="outline"
          size="sm"
          aria-busy={isPending}
          aria-disabled={isPending}
          className={buttonClassName}
          onClick={(e) => {
            blockLinkActivation(e);
            if (isPendingRef.current) return;
            setConfirmDialog("unarchive-all");
          }}
        >
          <ArchiveRestore className="text-purple-500" />
          Unarchive for all members
        </Button>

        <AlertDialog
          open={confirmDialog === "unarchive-all"}
          onOpenChange={(open) => !open && setConfirmDialog(null)}
        >
          <AlertDialogContent
            onClick={stopLinkNavigation}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              unarchiveAllTriggerRef.current?.focus();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Unarchive for all members?</AlertDialogTitle>
              <AlertDialogDescription>
                This also restores {group.groupName} for anyone who archived it
                themselves.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={stopLinkNavigation}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  stopLinkNavigation(e);
                  setConfirmDialog(null);
                  unarchiveForAll();
                }}
              >
                Unarchive for all members
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Archived only for this viewer.
  return (
    <Button
      variant="outline"
      size="sm"
      aria-busy={isPending}
      aria-disabled={isPending}
      className={buttonClassName}
      onClick={(e) => {
        blockLinkActivation(e);
        unarchiveForMe();
      }}
    >
      <ArchiveRestore className="text-purple-500" />
      Unarchive
    </Button>
  );
}

export function GroupCard({
  group,
  role,
  roleColors,
  archiveState,
}: GroupCardProps) {
  return (
    <Link
      href={`/g/${group.slug}`}
      className="flex h-full w-full rounded-md border border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800"
    >
      <div className="flex h-full w-full flex-col p-2 transition-colors">
        <div className="flex h-full flex-col justify-between gap-3 rounded-md bg-slate-50 p-6 dark:bg-slate-800">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black text-slate-950 dark:text-slate-300">
                {group.groupName}
              </h3>
              <Badge
                className={
                  roleColors
                    ? roleColors[role]
                    : "bg-green-100 text-green-800 hover:bg-green-100 dark:hover:bg-green-100"
                }
              >
                {role}
              </Badge>
            </div>
            <div>
              {(role === "creator" ||
                role === "admin" ||
                role === "manager") && (
                <div className="light:text-slate-600 flex items-center gap-4 text-sm dark:text-slate-300">
                  <UsersIcon className="h-4 w-4" />
                  <div className="flex gap-3">
                    <span>Admins: {group.admins?.length || 0}</span>
                    <span>Managers: {group.managers?.length || 0}</span>
                    <span>Members: {group.members?.length || 0}</span>
                  </div>
                </div>
              )}
              {!(
                role === "creator" ||
                role === "admin" ||
                role === "manager"
              ) && (
                <div className="light:text-slate-600 pt-2 text-sm dark:text-slate-300">
                  <div className="flex gap-3">
                    <span>Members: {group.members?.length || 0}</span>
                  </div>
                  <div className="light:text-slate-600 pt-2 text-sm dark:text-slate-300">
                    Creator:{" "}
                    {group.creator.firstName && group.creator.lastName
                      ? group.creator?.firstName + " " + group.creator?.lastName
                      : group.creator.email}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom section with archive controls */}
          {archiveState && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center"></div>
              <div className="flex items-center gap-2">
                <GroupArchiveControls
                  group={group}
                  archiveState={archiveState}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
