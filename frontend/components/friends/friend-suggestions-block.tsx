"use client";

import { Button } from "@/components/ui/button";
import { updateAuthorizedUser, updateUserInfo } from "@/lib/actions";
import { AuthorizedUser } from "@/types";
import { Pencil } from "lucide-react";
import { useFormStatus } from "react-dom";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { useState } from "react";
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
import { type } from "os";

export function FriendSuggestionsBlock({ user }: { user: AuthorizedUser }) {
  const [open, setOpen] = useState(false);
  const isAdmin = isAuthorizedUserAdmin(user.roles.map((role) => role.title));
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [bio, setBio] = useState(user.bio || "");
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

  const handleUpdateUser = async (formData: FormData) => {
    await updateAuthorizedUser(formData);
  };

  const handleEditUser = async (formData: FormData) => {
    const result = await updateUserInfo(
      formData.get("firstName") as string,
      formData.get("lastName") as string,
      formData.get("bio") as string,
      selectedRoles,
      user.id,
    );
    if (result.success) {
      toast.success("Information updated successfully");
    } else {
      console.log(result);
      toast.error("Failed to update information");
    }
    setOpen(false);
  };

  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-white">
            {user.email}
            {!user.isEnabled ? " (Disabled)" : ""}
          </p>
          <p className="text-sm truncate text-slate-500 dark:text-slate-400">
            {isAdmin ? "Admin" : ""}
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <div className="relative group">
                  <Pencil className="text-sky-600" />
                  <span className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Edit User
                  </span>
                </div>
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>Update user information</DialogDescription>
              </DialogHeader>

              <form action={handleEditUser} className="space-y-4">
                <input type="hidden" name="id" value={user.id} />
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
                <Input
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
                          className="border-sky-500 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500 focus-visible:ring-sky-500"
                        />
                        <label
                          htmlFor={role.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {role.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="submit">Save Changes</Button>
              </form>

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
      size="sm"
      variant={destructive ? "destructive" : "link"}
      aria-disabled={pending}
    >
      {children}
    </Button>
  );
}
