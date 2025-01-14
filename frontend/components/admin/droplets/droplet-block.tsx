"use client";

import { Button } from "@/components/ui/button";
import { updateDroplet } from "@/lib/actions";
import { Droplet } from "@/types";
import { Pencil } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import { DialogHeader } from "@/components/ui/dialog";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export function DropletBlock({ droplet }: { droplet: Droplet }) {
    const [open, setOpen] = useState(false);
    const [focusArea, setFocusArea] = useState(droplet.focusArea);
    const [type, setType] = useState(droplet.type);
    const [tags, setTags] = useState<string[]>(
        droplet.tags?.map(tag => tag.name) || []
    )

  const tagOptions = [
    { value: "iOS", label: "iOS" },
    { value: "Data Science", label: "Data Science" },
    { value: "Ethics", label: "Ethics" },
    { value: "React", label: "React" },
    { value: "Web", label: "Web" },
    { value: "Interviews", label: "Interviews" },
  ] as const;

  const toggleTag = (tag: string) => {
    setTags(current => 
      current.includes(tag) 
        ? current.filter(r => r !== tag)
        : [...current, tag]
    );
  };

  const [isDropletHidden, setIsDropletHidden] = useState(droplet.isHidden);

  useEffect(() => {
    setIsDropletHidden(droplet.isHidden);
}, [droplet.isHidden]);

  const handleUpdateDroplet = async (formData: FormData) => {
    const isHidden = formData.get("isHidden") === "true";
    console.log("hidden: ", isHidden)
  
    const result = await updateDroplet(droplet.id, { 
        isHidden: !isDropletHidden,  
        name: droplet.name,
        focusArea: droplet.focusArea,
        type: droplet.type,
        tagIds: droplet.tags?.map(tag => tag.id) || []
      }, {revalidate: true});
    
    if (result.ok) {
        setIsDropletHidden(!isDropletHidden);
        toast.success(`Droplet ${!isDropletHidden ? "hidden" : "shown"} successfully`);
    } else {
        toast.error("Failed to update droplet visibility");
        console.error(result.error);
    }
  };

  const handleEditDroplet = async (formData: FormData) => {
    // const result = await updateOnboardingInfo(
    //   firstName,
    //   lastName,
    //   bio,
    //   selectedRoles,
    //   user.id
    // );
    // if (result.success) {
    //   toast.success("Droplet updated successfully");
    // } else {
    //   console.log(result)
    //   toast.error("Failed to update droplet");
    // }
    setOpen(false);
  };

  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-white">
            {droplet.name}
            {isDropletHidden ? " (Hidden)" : ""}
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <div className="relative group">
                  <Pencil className="text-sky-600" />
                  <span className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Edit Droplet
                  </span>
                </div>
              </Button>
            </DialogTrigger>
            
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Droplet</DialogTitle>
                <DialogDescription>
                  Update droplet information
                </DialogDescription>
              </DialogHeader>

              <form action={handleEditDroplet} className="space-y-4">
                <input type="hidden" name="id" value={droplet.id} />
                {/* <Input 
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
                /> */}
                <div className="space-y-2">
                <label className="text-sm font-medium">Roles</label>
                <div className="space-y-2">
                  {tagOptions.map((tag) => (
                    <div key={tag.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={tag.value}
                        checked={tags.includes(tag.value)}
                        onCheckedChange={() => toggleTag(tag.value)}
                        className="border-sky-500 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500 focus-visible:ring-sky-500"
                      />
                      <label
                        htmlFor={tag.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {tag.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
                <Button type="submit">Save Changes</Button>
              </form>
            </DialogContent>
          </Dialog>
          <form action={handleUpdateDroplet}>
            <input
              id="id"
              name="id"
              type="number"
              defaultValue={droplet.id}
              hidden
            />
            <input
              id="isHidden"
              name="isHidden"
              type="text"
              defaultValue={String(isDropletHidden)}
              hidden
            />
            <SubmitButton destructive={!isDropletHidden}>
              {isDropletHidden ? "Show Droplet" : "Hide Droplet"}
            </SubmitButton>
          </form>
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
