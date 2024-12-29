"use client";

import { AuthorizedUser, Group } from "@/types";
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
import { GenericBlockInput as TipTapEditor } from "@/components/ui/tiptap/generic-block-input";
import { useRouter } from "next/navigation";
import { useState } from "react";

const formSchema = z.object({
  groupName: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  semester: z.string(),
  admins: z.array(z.number()),
  managers: z.array(z.number()),
});

interface GroupManagementFormProps {
  currentUser: AuthorizedUser;
  existingGroup?: Group | null;
}

export function GroupManagementForm({ currentUser, existingGroup }: GroupManagementFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupName: existingGroup?.groupName || "",
      description: existingGroup?.description || "",
      semester: existingGroup?.semester || "Open Membership",
      admins: existingGroup?.admins?.map(admin => admin.id) || [],
      managers: existingGroup?.managers?.map(manager => manager.id) || [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // TODO: Implement group creation/update logic
      console.log(" ---> new group info: ", values)
      router.push("/g/dashboard");
    } catch (error) {
      console.error("Failed to save group:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a semester" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Open Membership">Open Membership</SelectItem>
                    <SelectItem value="Spring 2025">Spring 2025</SelectItem>
                    {/* Add other semester options */}
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
                <FormControl>
                  {/* <TipTapEditor
                    content={field.value}
                    onChange={field.onChange}
                  /> */}
                  <TipTapEditor
                    initialContent={field.value || ""}
                    updateContent={field.onChange}
                    revalidate={() => {}}
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
          title="Member Management"
          emptyMessage="Member management functionality coming soon"
        >
          <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
            Member management will be available in a future update
          </div>
        </ContentSection>

        <Separator />

        <ContentSection
          title="Droplets"
          emptyMessage="Droplet management functionality coming soon"
        >
          <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
            Droplet management will be available in a future update
          </div>
        </ContentSection>

        <Separator />

        <ContentSection
          title="Playlists"
          emptyMessage="Playlist management functionality coming soon"
        >
          <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
            Playlist management will be available in a future update
          </div>
        </ContentSection>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/g/dashboard")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : (existingGroup ? "Update Group" : "Create Group")}
          </Button>
        </div>
      </form>
    </Form>
  );
}