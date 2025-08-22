"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {

  uploadImage,
} from "@/lib/actions";
import { AuthorizedUser } from "@/types";
import { Pencil, User2Icon } from "lucide-react";
import { useFormStatus } from "react-dom";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import {
  DialogHeader,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import imageCompression from "browser-image-compression";
import { updateAuthorizedUser, updateUserInfo } from "@/lib/requests/authorized-user";

export function AuthorizedUserBlock({
  user: initialUser,
}: {
  user: AuthorizedUser;
}) {
  const [user, setUser] = useState(initialUser);
  const [open, setOpen] = useState(false);
  const isAdmin = isAuthorizedUserAdmin(user.roles.map((role) => role.title));
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [bio, setBio] = useState(user.bio || "");
  const [profilePhoto, setProfilePhoto] = useState(user.profilePhoto || "");
  const [selectedRoles, setSelectedRoles] = useState<AuthorizedUserRoleTitle[]>(
    user.roles.map((role) => role.title),
  );

  const roleOptions = [
    { value: AuthorizedUserRoleTitle.AcadAdmin, label: "Academic Admin" },
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

  const compressImage = async (imageFile: File) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };
    try {
      return await imageCompression(imageFile, options);
    } catch (error) {
      console.error("Error compressing image:", error);
      return imageFile;
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file && file.type.startsWith("image/")) {
        const compressedFile = await compressImage(file);

        const newFormData: FormData = new FormData();
        newFormData.append("image", compressedFile as Blob);

        const response = await uploadImage(newFormData);

        if (response.ok && response.url) {
          setProfilePhoto(response.url);
          const updateResult = await updateUserInfo(
            firstName,
            lastName,
            bio,
            selectedRoles,
            response.url,
            user.id,
          );
          if (updateResult.success) {
            toast.success("Profile photo updated successfully");
          } else {
            toast.error("Failed to update profile photo");
          }
        } else {
          toast.error("Failed to upload image");
        }
      }
    },
    [firstName, lastName, bio, selectedRoles, user.id],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    onDragEnter: (e: React.DragEvent) => e.preventDefault(),
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDragLeave: (e: React.DragEvent) => e.preventDefault(),
  });

  const handleUpdateUser = async (formData: FormData) => {
    setUser((prev) => ({ ...prev, isEnabled: !prev.isEnabled }));

    await updateAuthorizedUser(formData);
  };

  const handleEditUser = async (formData: FormData) => {
    const result = await updateUserInfo(
      formData.get("firstName") as string,
      formData.get("lastName") as string,
      formData.get("bio") as string,
      selectedRoles,
      //formData.get("profilePhoto") as string,
      profilePhoto || "",
      user.id,
    );

    if (result.success) {
      toast.success("Information updated successfully");
    } else {
      toast.error("Failed to update information");
    }
    setOpen(false);
  };

  return (
    <li className="py-0 pb-3 md:pb-0 [&:not(:first-child)]:pt-0">
      <div className="flex items-center space-x-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-3">
            <Avatar variant="round" size="sm">
              <AvatarImage src={user.profilePhoto || undefined} />
              <AvatarFallback>
                {user.firstName && user.lastName ? (
                  user.firstName[0] + user.lastName[0]
                ) : (
                  <User2Icon />
                )}
              </AvatarFallback>
            </Avatar>
            <p className="truncate font-medium text-slate-900 dark:text-slate-300">
              {user.firstName && user.lastName
                ? user.firstName + " " + user.lastName
                : user.email}
              {!user.isEnabled ? " (Disabled)" : ""}
            </p>
            <p
              className="truncate text-sm text-slate-500 dark:text-slate-300"
              data-testid="user-role"
            >
              {isAdmin ? "Admin" : ""}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-white dark:bg-slate-300"
                role="button"
                aria-label="edit user"
              >
                <div className="group relative">
                  <Pencil className="text-sky-600" />
                  <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    Edit User
                  </span>
                </div>
              </Button>
            </DialogTrigger>

            <DialogContent className="scale-75 sm:scale-100">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>Update user information</DialogDescription>
              </DialogHeader>
              <div className="relative -mt-4">
                <form action={handleEditUser} className="space-y-2">
                  <input type="hidden" name="id" value={user.id} />
                  <p>Profile Photo</p>
                  <div
                    {...getRootProps()}
                    className="cursor-pointer rounded-lg border p-4 text-center dark:border-slate-500"
                  >
                    <input {...getInputProps()} name="profilePhoto" />
                    {profilePhoto ? (
                      <div className="flex flex-row items-center gap-4 pr-4">
                        <img
                          src={profilePhoto}
                          alt="Profile"
                          className="mx-auto h-32 w-32 rounded-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const result = await updateUserInfo(
                              firstName,
                              lastName,
                              bio,
                              selectedRoles,
                              "",
                              user.id,
                            );
                            if (result.success) {
                              setProfilePhoto("");
                              toast.success(
                                "Profile photo removed successfully",
                              );
                            } else {
                              toast.error("Failed to remove profile photo");
                            }
                          }}
                        >
                          Remove Photo
                        </Button>
                      </div>
                    ) : (
                      <p>Drag & drop a photo here, or click to select one</p>
                    )}
                  </div>
                  <Input
                    name="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                  />
                  <Input
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
                        <div
                          key={role.value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={role.value}
                            checked={selectedRoles.includes(role.value)}
                            onCheckedChange={() => toggleRole(role.value)}
                            className="border-sky-500 focus-visible:ring-sky-500 data-[state=checked]:border-sky-500 data-[state=checked]:bg-sky-500"
                          />
                          <label
                            htmlFor={role.value}
                            className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {role.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button type="submit">Save Changes</Button>
                </form>

                <div className="absolute bottom-0 translate-x-[105%]">
                  <form action={handleUpdateUser}>
                    <input
                      id="id"
                      name="id"
                      type="number"
                      defaultValue={user.id}
                      hidden
                    />
                    <input
                      id="isEnabled"
                      name="isEnabled"
                      type="text"
                      defaultValue={String(!user.isEnabled)}
                      hidden
                    />
                    <SubmitButton destructive={user.isEnabled}>
                      {user.isEnabled ? "Disable Access" : "Enable Access"}
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </li>
  );
}

function SubmitButton({
  destructive,
  children,
}: {
  destructive?: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className={
        destructive
          ? "bg-red-400 dark:bg-red-400 dark:hover:bg-red-300"
          : "bg-black dark:bg-slate-100"
      }
      aria-disabled={pending}
    >
      {children}
    </Button>
  );
}
