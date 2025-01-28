"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateGithub, updateLinkedin, updatePhoto } from "@/lib/actions";
import { AuthorizedUser } from "@/types";
import { useState } from "react";

export function SocialForms({
  authorizedUser,
}: {
  authorizedUser: AuthorizedUser | null;
}) {
  const [linkedinValue, setLinkedinValue] = useState(
    authorizedUser?.linkedin || "",
  );
  const [githubValue, setGithubValue] = useState(authorizedUser?.github || "");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];

    if (file && file.type.startsWith("image/")) {
      setProfileFile(file); 
      setProfileImage(URL.createObjectURL(file)); 
    } else {
      toast.error("Please upload a valid image file");
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setProfileFile(file); 
      setProfileImage(URL.createObjectURL(file));
    } else {
      toast.error("Please upload a valid image file");
    }
  };

  return (
    <>
    <form
        action={async (formData: FormData) => {
          if (profileFile && authorizedUser?.id) {
            const result = await updatePhoto(profileFile, authorizedUser.id);
            if (result.success) {
              toast.success("Profile photo updated successfully");
            } else {
              toast.error("Failed to update profile photo");
            }
          }
        }}
        className="px-6 py-4 flex flex-row gap-4 items-center"
      >
    <div 
        className="p-6 flex flex-col items-center border-2 border-dashed border-gray-400 rounded-lg cursor-pointer hover:border-gray-600"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {profileImage ? (
          <img
            src={profileImage}
            alt="Profile"
            className="w-32 h-32 object-cover rounded-full border"
          />
        ) : (
          <p className="text-gray-500">Drag & drop to update your profile photo here</p>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="fileUpload"
        />
        <label htmlFor="fileUpload" className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer">
          Upload Photo
        </label>
      </div>
      <Button type="submit" className="max-w-80">
          Save Photo
      </Button>
      </form>
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
        <div>LinkedIn:</div>
        <Input
          name="linkedin"
          value={linkedinValue}
          onChange={(e) => setLinkedinValue(e.target.value)}
          placeholder="Enter your LinkedIn url"
          className="max-w-80"
        />
        <Button type="submit" className="max-w-80">
          Save LinkedIn
        </Button>
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
      >
        {" "}
        <div>GitHub:</div>
        <Input
          name="github"
          value={githubValue}
          onChange={(e) => setGithubValue(e.target.value)}
          placeholder="Enter your GitHub url"
          className="max-w-80"
        />
        <Button type="submit" className="max-w-80">
          Save GitHub
        </Button>
      </form>
    </>
  );
}
