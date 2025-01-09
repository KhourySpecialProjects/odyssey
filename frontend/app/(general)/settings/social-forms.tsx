'use client';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateGithub, updateLinkedin } from "@/lib/actions";
import { AuthorizedUser } from "@/types";

export function SocialForms({ authorizedUser }: { authorizedUser: AuthorizedUser | null }) {
  return (
    <>
      <div className="px-6 py-4 border-t">
        <p className="text-sm text-slate-600">Socials:</p>
      </div>
      <form action={async (formData: FormData) => {
        const linkedin = formData.get('linkedin') as string;
        if (linkedin && authorizedUser?.id) {
          const result = await updateLinkedin(linkedin, authorizedUser.id);
          if (result.success) {
            toast.success('LinkedIn URL updated successfully');
          } else {
            toast.error('Failed to update LinkedIn URL');
          }
        }
      }} className="px-6 py-4 flex flex-col gap-4">
        <Input 
          name="linkedin"
          defaultValue={authorizedUser?.linkedin || ''}
          placeholder="Enter your LinkedIn url"
        />
        <Button type="submit">Save LinkedIn</Button>
      </form>

      <form action={async (formData: FormData) => {
        const github = formData.get('github') as string;
        if (github && authorizedUser?.id) {
          const result = await updateGithub(github, authorizedUser.id);
          if (result.success) {
            toast.success('GitHub URL updated successfully');
          } else {
            toast.error('Failed to update GitHub URL');
          }
        }
      }} className="px-6 py-4 flex flex-col gap-4">
        <Input 
          name="github"
          defaultValue={authorizedUser?.github || ''}
          placeholder="Enter your GitHub url"
        />
        <Button type="submit">Save GitHub</Button>
      </form>
    </>
  );
}