"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { toast } from "sonner";
import { uploadImage } from "@/lib/actions";
import { AuthorizedUser, User } from "@/types";
import { useState } from "react";
import imageCompression from "browser-image-compression";
import { Textarea } from "@/components/ui/textarea";
import { ProfileBlock } from "@/components/friends/profile-block";
import { updateUserInfo } from "@/lib/requests/authorized-user";
import TimeZoneSelector from "@/components/settings/time-zone-selector";
import Link from "next/link";
import { UploadIcon, User2Icon, LoaderIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, condenseRoleTitles } from "@/lib/utils";

export function SocialForms({
  authorizedUser,
  user,
}: {
  authorizedUser: AuthorizedUser;
  user: User;
}) {
  const [open, setOpen] = useState(false);
  const [bioValue, setBioValue] = useState(authorizedUser?.bio || "");
  const [linkedinValue, setLinkedinValue] = useState(
    authorizedUser?.linkedin || "",
  );
  const [githubValue, setGithubValue] = useState(authorizedUser?.github || "");
  const [websiteValue, setWebsiteValue] = useState(
    authorizedUser?.website || "",
  );
  const [profileImage, setProfileImage] = useState<string | null>(
    authorizedUser?.profilePhoto || "",
  );
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isPublicProfile, setIsPublicProfile] = useState(
    authorizedUser?.isPublic || false,
  );
  const updatePublicProfile = async (isPublic: boolean) => {
    setIsPublicProfile(isPublic);
    if (authorizedUser?.id) {
      await updateUserInfo(authorizedUser.id, {
        isPublic: isPublic,
      });
    }
  };
  function isValidGithubUrl(url: string) {
    return /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_-]+\/?$/.test(url);
  }

  function isValidLinkedinUrl(url: string) {
    return /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?$/.test(url);
  }

  function isValidWebsiteUrl(url: string) {
    return /^https:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(url);
  }

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const compressedFile = await compressImage(file);
      setProfileFile(compressedFile);
      setProfileImage(URL.createObjectURL(compressedFile));
    }
  };

  const handleRemovePhoto = async () => {
    setProfileImage("");
    setProfileFile(null);
    if (authorizedUser) {
      await updateUserInfo(authorizedUser?.id, { profilePhoto: "" });
      toast.success("Profile photo removed");
    }
  };

  const handleSaveAll = async () => {
    if (!authorizedUser?.id) return;
    setIsSaving(true);

    // Validate URLs
    if (linkedinValue && !isValidLinkedinUrl(linkedinValue)) {
      toast.error("Please enter a valid LinkedIn profile URL");
      setIsSaving(false);
      return;
    }
    if (githubValue && !isValidGithubUrl(githubValue)) {
      toast.error("Please enter a valid GitHub profile URL");
      setIsSaving(false);
      return;
    }
    if (websiteValue && !isValidWebsiteUrl(websiteValue)) {
      toast.error("Please enter a valid website URL");
      setIsSaving(false);
      return;
    }

    // Upload photo if changed
    if (profileFile) {
      const formData = new FormData();
      formData.append("image", profileFile as Blob);
      const response = await uploadImage(formData);
      if (response.ok && response.url) {
        setProfileImage(response.url);
        await updateUserInfo(authorizedUser.id, {
          profilePhoto: response.url,
        });
        setProfileFile(null);
      } else {
        toast.error("Failed to upload photo");
        setIsSaving(false);
        return;
      }
    }

    // Save all fields
    const result = await updateUserInfo(authorizedUser.id, {
      bio: bioValue,
      linkedin: linkedinValue,
      github: githubValue,
      website: websiteValue,
    });

    if (result.ok) {
      toast.success("Profile updated successfully");
    } else {
      toast.error("Failed to update profile");
    }

    setIsSaving(false);
  };

  return (
    <div className="space-y-8">
      {/* Profile section — Figma exact layout */}
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <Avatar variant="round" size="xl">
          <AvatarImage src={profileImage || user?.image || undefined} />
          <AvatarFallback className="text-2xl">
            {user?.name ? (
              getInitials(user.name)
            ) : (
              <User2Icon className="h-8 w-8" />
            )}
          </AvatarFallback>
        </Avatar>

        {/* Info + buttons column */}
        <div className="min-w-0 flex-1">
          {/* Name, NUID, Role(s) — evenly distributed */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl text-black dark:text-white">
                {user?.name}
              </p>
              <Link
                href={`mailto:${user?.email}`}
                className="text-lg text-[#475569] underline hover:text-slate-700 dark:text-slate-400"
              >
                {user?.email}
              </Link>
            </div>
            <div>
              {user?.nuid && (
                <>
                  <p className="text-2xl text-black dark:text-white">NUID</p>
                  <p className="text-lg text-[#475569] dark:text-slate-400">
                    {user.nuid}
                  </p>
                </>
              )}
            </div>
            <div>
              <p className="text-2xl text-black dark:text-white">Role(s)</p>
              <p className="text-lg text-[#475569] dark:text-slate-400">
                {condenseRoleTitles(user.roles)}
              </p>
            </div>
          </div>
          {/* Upload / Remove pill buttons */}
          <div className="mt-5 flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-md bg-[#287697] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f6080]">
              <UploadIcon className="h-4 w-4" />
              Upload
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={!profileImage}
              className="rounded-md border border-[#D0D5DD] px-4 py-2 text-sm font-medium text-[#344054] transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="mb-2 block text-xl font-bold text-slate-900 dark:text-white">
          Bio
        </label>
        <Textarea
          name="bio"
          value={bioValue}
          onChange={(e) => setBioValue(e.target.value)}
          placeholder="Enter your bio"
          className="min-h-[120px] border-[#D0D5DD] dark:border-slate-700"
        />
      </div>

      {/* LinkedIn & GitHub — side by side */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xl font-bold text-slate-900 dark:text-white">
            LinkedIn
          </label>
          <Input
            name="linkedin"
            value={linkedinValue}
            onChange={(e) => setLinkedinValue(e.target.value)}
            placeholder="Enter your LinkedIn url"
            className="border-[#D0D5DD] dark:border-slate-700"
          />
        </div>
        <div>
          <label className="mb-2 block text-xl font-bold text-slate-900 dark:text-white">
            GitHub
          </label>
          <Input
            name="github"
            value={githubValue}
            onChange={(e) => setGithubValue(e.target.value)}
            placeholder="Enter your GitHub url"
            className="border-[#D0D5DD] dark:border-slate-700"
          />
        </div>
      </div>

      {/* Website & Time Zone — side by side */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xl font-bold text-slate-900 dark:text-white">
            Website
          </label>
          <Input
            name="website"
            value={websiteValue}
            onChange={(e) => setWebsiteValue(e.target.value)}
            placeholder="Enter your website url"
            className="border-[#D0D5DD] dark:border-slate-700"
          />
        </div>
        <TimeZoneSelector
          currentZone={authorizedUser.timeZone?.trim()}
          userId={authorizedUser.id}
        />
      </div>

      {/* Public profile toggle + Save button — same row, opposite sides */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <label className="block text-base">Show my profile publicly</label>
            <Switch
              checked={isPublicProfile}
              onCheckedChange={updatePublicProfile}
            />
          </div>
          {isPublicProfile && (
            <div className="text-sm text-gray-600 dark:text-slate-300">
              Your profile is visible at{" "}
              <Link
                href={`/prof/${authorizedUser.email.substring(
                  0,
                  authorizedUser.email.indexOf("@"),
                )}`}
                className="text-sky-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-600"
              >
                khouryodyssey.org/prof/
                {authorizedUser.email.substring(
                  0,
                  authorizedUser.email.indexOf("@"),
                )}
              </Link>{" "}
              <ContentCopyIcon
                onClick={() => {
                  const profileLink = `khouryodyssey.org/prof/${authorizedUser.email.substring(
                    0,
                    authorizedUser.email.indexOf("@"),
                  )}`;
                  toast.success("Profile link copied to clipboard");
                  navigator.clipboard.writeText(profileLink);
                }}
                className="cursor-pointer text-gray-600 hover:text-gray-800 dark:text-slate-300"
                fontSize="small"
              />
            </div>
          )}
        </div>
        <Button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-[#287697] text-white hover:bg-[#1f6080]"
        >
          {isSaving && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      <div>
        <ProfileBlock
          user={authorizedUser}
          otherUser={authorizedUser}
          isOpen={open}
          setIsOpen={setOpen}
        />
      </div>
    </div>
  );
}
