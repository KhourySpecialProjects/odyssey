"use client";

import { AuthorizedUser, Droplet, Group } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserMultiSelect } from "@/components/ui/user-multi-select";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DropletList } from "@/components/group/group-management-droplet-list";
import { GeneralTextEditor } from "../ui/tiptap/general-text-editor";
import { GroupSemester, Playlist, Voyage } from "@/types";
import { PlaylistList } from "@/components/group/group-management-playlist-list";
import { VoyageList } from "@/components/group/group-management-voyage-list";
import { updateGroup } from "@/lib/requests/groups";
import { AddDropletDialog } from "./add-droplet-dialog";
import { AddPlaylistDialog } from "./add-playlist-dialog";
import { AddVoyageDialog } from "./add-voyage-dialog";
import { BulkAddUsersDialog } from "./bulk-add-users-dialog";
import { createGroup } from "@/lib/requests/groups";
import { enrollUsers } from "@/lib/requests/groups";
import { getGroupByID } from "@/lib/requests/groups";
import { createGroupAnnouncement } from "@/lib/requests/feed";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

const SEMESTER_OPTIONS: GroupSemester[] = [
  "Open Membership",
  "Spring 2025",
  "Summer 1 2025",
  "Summer 2 2025",
  "Summer 2025",
  "Fall 2025",
  "Spring 2026",
  "Summer 1 2026",
  "Summer 2 2026",
  "Summer 2026",
  "Fall 2026",
  "Spring 2027",
  "Summer 1 2027",
  "Summer 2 2027",
  "Summer 2027",
  "Fall 2027",
];

const formSchema = z.object({
  groupName: z.string(),
  description: z.string().optional(),
  semester: z.string(),
  admins: z.array(z.number()),
  managers: z.array(z.number()),
  members: z.array(z.number()),
  droplets: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        slug: z.string(),
        focusArea: z.string(),
        type: z.string(),
        order: z.number().optional(),
        lessons: z
          .array(
            z.object({
              id: z.number(),
              name: z.string(),
              slug: z.string(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),

  playlists: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        slug: z.string(),
        isPublic: z.boolean(),
        duration: z.string().optional(),
        order: z.number().optional(),
        droplets: z
          .array(
            z.object({
              id: z.number(),
              name: z.string(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),

  voyages: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        slug: z.string(),
      }),
    )
    .optional(),
});
interface GroupManagementFormProps {
  currentUser: AuthorizedUser;
  existingGroup?: Group | null;
}
export function GroupManagementForm({
  currentUser,
  existingGroup,
}: GroupManagementFormProps) {
  const [submissionState, setSubmissionState] = useState<{
    error: string | null;
  }>({ error: null });
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [droplets, setDroplets] = useState<Droplet[]>(
    existingGroup?.droplets?.sort((a, b) => a.name.localeCompare(b.name)) || [],
  );
  const [playlists, setPlaylists] = useState<Playlist[]>(
    existingGroup?.playlists?.sort((a, b) => a.name.localeCompare(b.name)) ||
      [],
  );
  const [voyages, setVoyages] = useState<Voyage[]>(
    existingGroup?.voyages?.sort((a, b) => a.name.localeCompare(b.name)) || [],
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupName: existingGroup?.groupName || "",
      description: existingGroup?.description || "",
      semester: existingGroup?.semester || "Open Membership",
      admins: existingGroup?.admins?.map((admin) => admin.id) || [],
      managers: existingGroup?.managers?.map((manager) => manager.id) || [],
      members: existingGroup?.members?.map((member) => member.id) || [],
      droplets:
        existingGroup?.droplets?.map((droplet, index) => ({
          id: droplet.id,
          name: droplet.name,
          slug: droplet.slug,
          focusArea: droplet.focusArea,
          type: droplet.type,
          order: index,
          lessons: droplet.lessons?.map((lesson) => ({
            id: lesson.id,
            name: lesson.name,
            slug: lesson.slug,
          })),
        })) || [],

      playlists:
        existingGroup?.playlists?.map((playlist, index) => ({
          id: playlist.id,
          name: playlist.name,
          slug: playlist.slug,
          isPublic: playlist.isPublic,
          duration: playlist.duration,
          order: index,
          droplets: playlist.droplets?.map((droplet) => ({
            id: droplet.id,
            name: droplet.name,
          })),
        })) || [],

      voyages:
        existingGroup?.voyages?.map((voyage) => ({
          id: voyage.id,
          name: voyage.name,
          slug: voyage.slug,
        })) || [],
    },
  });

  useEffect(() => {
    const subscription = form.watch(() => {
      setHasChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    setSubmissionState({ error: null });
  }, [hasChanges]);

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes.  Are you sure you want to leave?",
      );
      if (!confirmed) return;
    }
    router.push(
      existingGroup ? `/g/${existingGroup.slug}` : "/g/dashboard?tab=creator",
    );
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!data.groupName || data.groupName === "") {
      setSubmissionState({ error: "Please fill out group name" });
      return;
    }
    setSubmissionState({ error: null });
    setIsSubmitting(true);
    try {
      const updateGroupData = {
        groupName: data.groupName,
        description: data.description,
        semester: data.semester,
        admins: data.admins,
        managers: data.managers,
        memberIds: data.members,
        droplets: data.droplets?.map((droplet, index) => ({
          ...droplet,
          order: index,
        })),
        playlists: data.playlists?.map((playlist, index) => ({
          ...playlist,
          order: index,
        })),
        voyages: data.voyages?.map((voyage) => ({
          ...voyage,
        })),
      };

      const createGroupData = {
        groupName: data.groupName,
        description: data.description,
        semester: data.semester as GroupSemester,
        initialMembers: {
          admins: data.admins,
          managers: data.managers,
          memberIds: data.members,
        },
        droplets: data.droplets?.map((d) => d.id),
        playlists: data.playlists?.map((p) => p.id),
        voyages: data.voyages?.map((v) => v.id),
      };

      if (existingGroup) {
        await updateGroup(existingGroup.id, updateGroupData);
        await enrollUsers(await getGroupByID(existingGroup.id));
      } else {
        const newGroup = await createGroup(currentUser.id, createGroupData);
        await enrollUsers(await getGroupByID(newGroup.id));
      }
      setIsOpen(true);
    } catch (error) {
      console.error("Failed to update group", error);
      setSubmissionState({
        error: "Failed to save group. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDropletReorder = (reorderedDroplets: Droplet[]) => {
    const updatedDroplets = reorderedDroplets.map((droplet, index) => ({
      ...droplet,
      order: index,
    }));
    form.setValue("droplets", updatedDroplets);
    setDroplets(updatedDroplets);
  };

  const handleGroupPost = async () => {
    setIsOpen(false);
    try {
      if (existingGroup) {
        await createGroupAnnouncement(
          existingGroup.groupName,
          existingGroup.id,
        );
        router.push("/g/dashboard?tab=creator");
      } else {
        router.push("/g/dashboard?tab=creator");
      }
    } catch (error) {
      console.error("Failed to make group announcement: ", error);
      setSubmissionState({
        error: "Failed to share announcement. Please try again.",
      });
    }
  };

  const handleDropletRemove = (dropletId: number) => {
    const currentDroplets = form.getValues("droplets") || [];
    const updatedDroplets = currentDroplets.filter((d) => d.id !== dropletId);
    form.setValue("droplets", updatedDroplets);
    setDroplets(updatedDroplets as Droplet[]);
  };

  const handlePlaylistReorder = (reorderedPlaylists: Playlist[]) => {
    const updatedPlaylists = reorderedPlaylists.map((playlist, index) => ({
      ...playlist,
      order: index,
    }));
    form.setValue("playlists", updatedPlaylists);
    setPlaylists(updatedPlaylists);
  };

  const handlePlaylistRemove = (playlistId: number) => {
    const currentPlaylists = form.getValues("playlists") || [];
    const updatedPlaylists = currentPlaylists.filter(
      (p) => p.id !== playlistId,
    );

    form.setValue("playlists", updatedPlaylists);
    setPlaylists(updatedPlaylists as Playlist[]);
  };

  const handleVoyageReorder = (reorderedVoyages: Voyage[]) => {
    form.setValue("voyages", reorderedVoyages);
    setVoyages(reorderedVoyages);
  };

  const handleVoyageRemove = (voyageId: number) => {
    const currentVoyages = form.getValues("voyages") || [];
    const updatedVoyages = currentVoyages.filter((v) => v.id !== voyageId);
    form.setValue("voyages", updatedVoyages);
    setVoyages(updatedVoyages as Voyage[]);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) =>
          console.error("Form validation failed ", errors),
        )}
        className="flex h-min w-full flex-col space-y-8"
        autoComplete="off"
      >
        {/* Name */}
        <FormField
          control={form.control}
          name="groupName"
          render={({ field }) => (
            <FormItem>
              <div className="py-0.5 pb-2 text-xl font-bold text-slate-900 dark:text-white">
                Name <span className="text-red-500">*</span>
              </div>
              <FormControl>
                <Input
                  placeholder="Enter group name"
                  className="max-w-full border-[#D0D5DD] placeholder:text-[#121216] dark:border-slate-700"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Semester */}
        <FormField
          control={form.control}
          name="semester"
          render={({ field }) => (
            <FormItem>
              <div className="py-0.5 pb-2 text-xl font-bold text-slate-900 dark:text-white">
                Semester
              </div>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full border-[#D0D5DD] dark:border-slate-700">
                    <SelectValue placeholder="Select a semester" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SEMESTER_OPTIONS.map((semester) => (
                    <SelectItem key={semester} value={semester}>
                      {semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Administrators & Members side by side */}
        <div className="xs:flex-col flex items-start justify-start gap-x-10 gap-y-8 lg:flex-row">
          <FormField
            control={form.control}
            name="admins"
            render={({ field }) => (
              <FormItem className="xs:w-full lg:w-1/2">
                <div className="flex items-center justify-between py-0.5 pb-2">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    Administrators
                  </div>
                  <BulkAddUsersDialog
                    label="Administrators"
                    existingIds={field.value}
                    onAddUsers={(newIds) =>
                      field.onChange([...field.value, ...newIds])
                    }
                  />
                </div>
                <FormControl>
                  <UserMultiSelect
                    selectedIds={field.value}
                    onChange={field.onChange}
                    placeholder="Select administrators..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="members"
            render={({ field }) => (
              <FormItem className="xs:w-full lg:w-1/2">
                <div className="flex items-center justify-between py-0.5 pb-2">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    Members
                  </div>
                  <BulkAddUsersDialog
                    label="Members"
                    existingIds={field.value}
                    onAddUsers={(newIds) =>
                      field.onChange([...field.value, ...newIds])
                    }
                  />
                </div>
                <FormControl>
                  <UserMultiSelect
                    selectedIds={field.value}
                    onChange={field.onChange}
                    placeholder="Select members..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <div className="py-0.5 pb-2 text-xl font-bold text-slate-900 dark:text-white">
                Description
              </div>
              <FormControl className="w-full">
                <GeneralTextEditor
                  initialContent={field.value || ""}
                  updateContent={field.onChange}
                  placeholder="Enter group description..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Droplets */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="py-0.5 text-xl font-bold text-slate-900 dark:text-white">
              Droplets
            </div>
            <AddDropletDialog
              currentDroplets={droplets}
              onAddDroplets={(newDroplet) => {
                const updatedDroplets = [...droplets, ...newDroplet];
                setDroplets(updatedDroplets);
                form.setValue("droplets", updatedDroplets);
              }}
            />
          </div>
          {droplets.length > 0 ? (
            <DropletList
              droplets={droplets}
              onReorder={handleDropletReorder}
              onRemove={handleDropletRemove}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-[#D0D5DD] p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No droplets have been added to this group yet
            </div>
          )}
        </div>

        {/* Playlists */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="py-0.5 text-xl font-bold text-slate-900 dark:text-white">
              Playlists
            </div>
            <AddPlaylistDialog
              currentPlaylists={playlists}
              onAddPlaylists={(newPlaylists) => {
                const updatedPlaylists = [...playlists, ...newPlaylists];
                setPlaylists(updatedPlaylists);
                form.setValue("playlists", updatedPlaylists);
              }}
            />
          </div>
          {playlists.length > 0 ? (
            <PlaylistList
              playlists={playlists}
              onReorder={handlePlaylistReorder}
              onRemove={handlePlaylistRemove}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-[#D0D5DD] p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No playlists have been added to this group yet
            </div>
          )}
        </div>

        {/* Voyages */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="py-0.5 text-xl font-bold text-slate-900 dark:text-white">
              Voyages
            </div>
            <AddVoyageDialog
              currentVoyages={voyages}
              onAddVoyages={(newVoyages) => {
                const updatedVoyages = [...voyages, ...newVoyages];
                setVoyages(updatedVoyages);
                form.setValue("voyages", updatedVoyages);
              }}
            />
          </div>
          {voyages.length > 0 ? (
            <VoyageList
              voyages={voyages}
              onReorder={handleVoyageReorder}
              onRemove={handleVoyageRemove}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-[#D0D5DD] p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No voyages have been added to this group yet
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 self-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="border-[#D0D5DD] text-[#344054] hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="bg-[#287697] text-white hover:bg-[#1f6080]"
          >
            {isSubmitting
              ? "Saving..."
              : existingGroup
                ? "Update Group"
                : "Create Group"}
          </Button>
        </div>

        {submissionState.error && (
          <div className="w-full rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {submissionState.error}
            </p>
          </div>
        )}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-[825px]">
            <DialogHeader>
              <DialogTitle>
                Would you like to announce these changes to everyone enrolled in
                this group?
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-4">
              <Button onClick={handleGroupPost}>Share</Button>
              <Button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/g/dashboard?tab=creator");
                }}
              >
                Not Now
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </form>
    </Form>
  );
}
