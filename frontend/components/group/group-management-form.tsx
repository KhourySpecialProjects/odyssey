"use client";

import { AuthorizedUser, Droplet, Group, User } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { Separator } from "@/components/ui/separator";
import { ContentSection } from "@/components/group/content-section";
import { UserMultiSelect } from "@/components/ui/user-multi-select";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DropletList } from "@/components/group/group-management-droplet-list";
import { GeneralTextEditor } from "../ui/tiptap/general-text-editor";
import { GroupSemester, Playlist } from "@/types";
import { PlaylistList } from "@/components/group/group-management-playlist-list";
import { updateGroup } from "@/lib/requests/groups";
import { AddDropletDialog } from "./add-droplet-dialog";
import { AddPlaylistDialog } from "./add-playlist-dialog";
import { AddMemberDialog } from "./add-member-dialog";
import { MemberTile } from "./member-tile";
import { createGroup } from "@/lib/requests/groups";
import { enrollUsers } from "@/lib/requests/groups";
import { getGroupByID } from "@/lib/requests/groups";
import { createGroupAnnouncement } from "@/lib/requests/feed";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { X } from "lucide-react";
import { deleteGroup } from "@/lib/actions";

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
  groupName: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  semester: z.string(),
  admins: z.array(z.number()),
  managers: z.array(z.number()),

  members: z.array(z.custom<User>()),
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
});
interface GroupManagementFormProps {
  currentUser: AuthorizedUser;
  existingGroup?: Group | null;
}
// TODO: Technical debt abounds.  There are some minor differences between
// several different user types that have caused some headaches.
// Currently, just trying to get the functionality done.  Will refactor
// later.
export function GroupManagementForm({
  currentUser,
  existingGroup,
}: GroupManagementFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [droplets, setDroplets] = useState<Droplet[]>(
    existingGroup?.droplets || [],
  );
  const [playlists, setPlaylists] = useState<Playlist[]>(
    existingGroup?.playlists || [],
  );
  const [members, setMembers] = useState<User[]>(existingGroup?.members || []);
  const [hasChanges, setHasChanges] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const onOpenChange = (open: boolean) => {
    if (!open) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  };

  const handleDelete = async () => {
    if (existingGroup) {
      const response = await deleteGroup(existingGroup.id);
      if (response.ok && !response.error) {
        router.replace(`/g/dashboard`);
      }
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupName: existingGroup?.groupName || "",
      description: existingGroup?.description || "",
      semester: existingGroup?.semester || "Open Membership",
      admins: existingGroup?.admins?.map((admin) => admin.id) || [],
      managers: existingGroup?.managers?.map((manager) => manager.id) || [],
      members:
        existingGroup?.members?.map((member) => ({
          email: member.email,
          roles: member.roles || [],
          isActive: member.isActive ?? true,
        })) || [],
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
    },
  });

  useEffect(() => {
    const subscription = form.watch(() => {
      setHasChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes.  Are you sure you want to leave?",
      );
      if (!confirmed) return;
    }
    router.push(existingGroup ? `/g/${existingGroup.slug}` : "/g/dashboard");
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      // Prepare data for backend submission
      const updateGroupData = {
        groupName: data.groupName,
        description: data.description,
        semester: data.semester,
        admins: data.admins,
        managers: data.managers,
        members: data.members?.map((member) => ({
          email: member.email ?? null,
          roles: member.roles,
          isActive: member.isActive,
        })),
        droplets: data.droplets?.map((droplet, index) => ({
          ...droplet,
          order: index, // Update order based on current array position
        })),
        playlists: data.playlists?.map((playlist, index) => ({
          ...playlist,
          order: index, // Update order based on current array position
        })),
      };

      const createGroupData = {
        groupName: data.groupName,
        description: data.description,
        semester: data.semester as GroupSemester,
        initialMembers: {
          admins: data.admins,
          managers: data.managers,
          // admins: data.admins
          //   .map(
          //     (id) =>
          //       existingGroup?.admins?.find((admin) => admin.id === id)
          //         ?.email ?? "",
          //   )
          //   .filter(Boolean),
          // managers: data.managers
          //   .map(
          //     (id) =>
          //       existingGroup?.managers?.find((manager) => manager.id === id)
          //         ?.email ?? "",
          //   )
          //   .filter(Boolean),
          members: data.members?.map((m) => m.email ?? "").filter(Boolean), // Just get the emails
        },
        droplets: data.droplets?.map((d) => d.id),
        playlists: data.playlists?.map((p) => p.id),
      };

      if (existingGroup) {
        const response = await updateGroup(existingGroup.id, updateGroupData);
        await enrollUsers(await getGroupByID(existingGroup.id));
        //router.push(`/g/${response.slug}`);
      } else {
        const newGroup = await createGroup(currentUser.id, createGroupData);
        await enrollUsers(await getGroupByID(newGroup.id));
        router.push(`/g/${newGroup.slug}`);
      }
    } catch (error) {
      // Handle error
      console.error("Failed to update group", error);
    }
  };

  const handleDropletReorder = (reorderedDroplets: Droplet[]) => {
    console.debug("  --> Group Mgmt - reordering droplets ", reorderedDroplets);
    const updatedDroplets = reorderedDroplets.map((droplet, index) => ({
      ...droplet,
      order: index,
    }));
    form.setValue("droplets", updatedDroplets);
    setDroplets(updatedDroplets);
  };

  const handleGroupPost = async () => {
    try {
      if (existingGroup) {
        await createGroupAnnouncement(
          existingGroup.groupName,
          existingGroup.id,
        );
        router.back();
      }
    } catch (error) {
      console.error("Failed to make playlist announcement: ", error);
    }
  };

  const handleDropletRemove = (dropletId: number) => {
    console.debug("  --> Group Mgmt - removing droplet ", dropletId);
    const currentDroplets = form.getValues("droplets") || [];
    const updatedDroplets = currentDroplets.filter((d) => d.id !== dropletId);
    form.setValue("droplets", updatedDroplets);
    setDroplets(updatedDroplets as Droplet[]);
  };

  const handlePlaylistReorder = (reorderedPlaylists: Playlist[]) => {
    console.debug(
      "  --> Group Mgmt - reordering playlist ",
      reorderedPlaylists,
    );
    const updatedPlaylists = reorderedPlaylists.map((playlist, index) => ({
      ...playlist,
      order: index,
    }));
    form.setValue("playlists", updatedPlaylists);
    setPlaylists(updatedPlaylists);
  };

  const handlePlaylistRemove = (playlistId: number) => {
    console.debug("  --> Group Mgmt - removing playlist ", playlistId);
    const currentPlaylists = form.getValues("playlists") || [];
    const updatedPlaylists = currentPlaylists.filter(
      (p) => p.id !== playlistId,
    );

    form.setValue("playlists", updatedPlaylists);
    setPlaylists(updatedPlaylists as Playlist[]);
  };

  const handleMemberRemove = (emailToRemove: string) => {
    console.debug("  --> Group Mgmt - removing member ", emailToRemove);
    const currentMembers = form.getValues("members") || [];
    const updatedMembers = currentMembers.filter(
      (m) => m.email !== emailToRemove,
    );

    form.setValue("members", updatedMembers);
    setMembers(
      updatedMembers.map((member) => ({
        ...member,
        roles: [],
        isActive: member.isActive ?? true,
      })),
    );
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) =>
          console.error("Form validation failed ", errors),
        )}
        className="space-y-12"
      >
        <div className="space-y-8">
          <FormField
            control={form.control}
            name="groupName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter group name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="semester"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Semester</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
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

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl className="w-full">
                  {/* <TipTapEditor
                    content={field.value}
                    onChange={field.onChange}
                  /> */}
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
        </div>

        <Separator />

        <ContentSection title="Group Leadership">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="admins"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Administrators</FormLabel>
                  <FormControl>
                    <UserMultiSelect
                      selectedIds={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="managers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Managers</FormLabel>
                  <FormControl>
                    <UserMultiSelect
                      selectedIds={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </ContentSection>

        <Separator />

        <ContentSection
          title="Members"
          emptyMessage="No members in this group yet"
          action={
            <AddMemberDialog
              existingMembers={members.map((member) => ({
                email: member.email ?? "",
              }))}
              onAddMembers={(emails) => {
                const newMembers = emails.map(
                  (email) =>
                    ({
                      email,
                      roles: [],
                      isActive: true,
                    }) as User,
                );
                const updatedMembers = [...members, ...newMembers];
                setMembers(updatedMembers);
                form.setValue("members", updatedMembers);
              }}
            />
          }
        >
          {members.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {members.map((member) => (
                <MemberTile
                  key={member.email}
                  member={member}
                  role={
                    member.email === existingGroup?.creator.email
                      ? "admin"
                      : existingGroup?.admins?.find(
                            (a) => a.email === member.email,
                          )
                        ? "admin"
                        : existingGroup?.managers?.find(
                              (m) => m.email === member.email,
                            )
                          ? "manager"
                          : "member"
                  }
                  onRemove={
                    // Prevent removal of group creator
                    member.email !== existingGroup?.creator.email
                      ? handleMemberRemove
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
              No members have been added to this group yet
            </div>
          )}
        </ContentSection>

        <ContentSection
          title="Droplets"
          emptyMessage="No droplets added to this group yet"
          action={
            <AddDropletDialog
              currentDroplets={droplets}
              onAddDroplets={(newDroplet) => {
                const updatedDroplets = [...droplets, ...newDroplet];
                setDroplets(updatedDroplets);
                form.setValue("droplets", updatedDroplets);
              }}
            />
          }
        >
          {droplets.length > 0 ? (
            <DropletList
              droplets={droplets}
              onReorder={handleDropletReorder}
              onRemove={handleDropletRemove}
            />
          ) : (
            <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
              No droplets have been added to this group yet
            </div>
          )}
        </ContentSection>

        <Separator />

        <ContentSection
          title="Playlists"
          emptyMessage="No playlists added to this group yet"
          action={
            <AddPlaylistDialog
              currentPlaylists={playlists}
              onAddPlaylists={(newPlaylists) => {
                const updatedPlaylists = [...playlists, ...newPlaylists];
                setPlaylists(updatedPlaylists);
                form.setValue("playlists", updatedPlaylists);
              }}
            />
          }
        >
          {playlists.length > 0 ? (
            <PlaylistList
              playlists={playlists}
              onReorder={handlePlaylistReorder}
              onRemove={handlePlaylistRemove}
            />
          ) : (
            <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
              No playlists have been added to this group yet
            </div>
          )}
        </ContentSection>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          {/* <Button variant="destructive" className="gap-2" onClick={handleDelete}>
            <X className="h-4 w-4" />
            Delete Group
          </Button> */}
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={() => setIsOpen(true)}
          >
            {isSubmitting
              ? "Saving..."
              : existingGroup
                ? "Update Group"
                : "Create Group"}
          </Button>
          <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[825px]">
              <DialogHeader>
                <DialogTitle>
                  Would you like to announce these changes to everyone enrolled
                  in this group?
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4 mt-4">
                <Button onClick={handleGroupPost}>Share</Button>
                <Button onClick={() => router.back()}>Not Now</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </form>
    </Form>
  );
}
