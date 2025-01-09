"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateGithub, updateLinkedin } from "@/lib/actions";
import { AuthorizedUser } from "@/types";
import { useState } from "react";

export function SocialForms({ authorizedUser }: { authorizedUser: AuthorizedUser | null }) {
  const [linkedinValue, setLinkedinValue] = useState(authorizedUser?.linkedin || '');
  const [githubValue, setGithubValue] = useState(authorizedUser?.github || '');

  return (
    <>
      <form 
        action={async (formData: FormData) => {
          const linkedin = formData.get("linkedin") as string;
          if (linkedin && authorizedUser?.id) {
            const result = await updateLinkedin(linkedin, authorizedUser.id);
            if (result.success) {
              setLinkedinValue(linkedin);
              toast.success("LinkedIn URL updated successfully");
            } else {
              toast.error("Failed to update LinkedIn URL");
            }
          }
        }}
        className="px-6 py-4 flex flex-row gap-4 items-center"
      >
        <div>
          LinkedIn:
        </div>
        <Input
          name="linkedin"
          value={linkedinValue}
          onChange={(e) => setLinkedinValue(e.target.value)}
          placeholder="Enter your LinkedIn url"
          className="max-w-80"
        />
        <Button type="submit" className="max-w-80">Save LinkedIn</Button>
      </form>

      <form
        action={async (formData: FormData) => {
          const github = formData.get("github") as string;
          if (github && authorizedUser?.id) {
            const result = await updateGithub(github, authorizedUser.id);
            if (result.success) {
              setGithubValue(github);
              toast.success("GitHub URL updated successfully");
            } else {
              toast.error("Failed to update GitHub URL");
            }
          }
        }}
        className="px-6 py-4 flex flex-row gap-4 items-center"
      > <div>
        GitHub: 
      </div>
        <Input
          name="github"
          value={githubValue}
          onChange={(e) => setGithubValue(e.target.value)}
          placeholder="Enter your GitHub url"
          className="max-w-80"
        />
        <Button type="submit" className="max-w-80">Save GitHub</Button>
      </form>
    </>
  );
}