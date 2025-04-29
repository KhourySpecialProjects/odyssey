"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  updateAuthorBio,
  updateGithub,
  updateLinkedin,
  updatePhoto,
  uploadImage,
} from "@/lib/actions";
import { AuthorizedUser } from "@/types";
import { useState } from "react";
import imageCompression from "browser-image-compression";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";
import { ProfileBlock } from "@/components/friends/profile-block";
import { notFound } from "next/navigation";

export function SocialForms({
  authorizedUser,
}: {
  authorizedUser: AuthorizedUser | null;
}) {
  if (!authorizedUser) {
    return notFound();
  }
  const [open, setOpen] = useState(false);
  const [bioValue, setBioValue] = useState(authorizedUser?.bio || "");
  const [linkedinValue, setLinkedinValue] = useState(
    authorizedUser?.linkedin || "",
  );
  const [githubValue, setGithubValue] = useState(authorizedUser?.github || "");
  const [profileImage, setProfileImage] = useState<string | null>(
    authorizedUser?.profilePhoto || "",
  );
  const [profileFile, setProfileFile] = useState<File | null>(null);

  function isValidGithubUrl(url: string) {
    return /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_-]+\/?$/.test(url);
  }

  function isValidLinkedinUrl(url: string) {
    return /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?$/.test(url);
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

  const FileUpload = ({
    file,
    setFile,
    imagePreview,
  }: {
    file: File | null;
    setFile: (file: File | null) => void;
    imagePreview: string | null;
  }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith("image/")) {
        const compressedFile = await compressImage(file);
        setFile(compressedFile);
      }
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        const compressedFile = await compressImage(file);
        setFile(compressedFile);
      } else {
        toast.error("Please upload a valid image file");
      }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = () => {
      setIsDragging(false);
    };

    const handleRemoveFile = () => {
      setFile(null);
    };

    return (
      <div
        className={`flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer w-[64%]
          ${isDragging ? "border-blue-300 bg-blue-50 dark:bg-slate-800" : "border-gray-300 dark:border-slate-500 border-dashed"}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {imagePreview ? (
          <img
            src={imagePreview}
            alt="Profile"
            className="w-32 h-32 object-cover rounded-full border mb-4"
          />
        ) : (
          <p className="text-gray-500 dark:text-slate-400 mb-4">
            Drag & drop to update your profile photo here
          </p>
        )}

        <label className="bg-blue-500 text-white py-2 px-4 rounded cursor-pointer">
          {file || profileImage ? "Change Photo" : "Upload Photo"}
          <input
            name="profilePhoto"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {file && (
          <div className="flex items-center justify-between w-full mt-4">
            <span className="truncate flex-grow">{file.name}</span>
            <button
              type="button"
              className="bg-red-500 text-white py-1 px-2 rounded ml-2"
              onClick={handleRemoveFile}
            >
              Remove
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <form
        action={async () => {
          if (profileFile && authorizedUser?.id) {
            const newFormData: FormData = new FormData();
            newFormData.append("image", profileFile as Blob);

            const response = await uploadImage(newFormData);
            if (response.ok && response.url) {
              setProfileImage(response.url);
              const updateResult = await updatePhoto(
                response.url,
                authorizedUser.id,
              );
              if (updateResult.success) {
                toast.success("Profile photo updated successfully");
              } else {
                console.error(updateResult.error);
                toast.error("Failed to update profile photo");
              }
            } else {
              console.error(response.error);
              toast.error("Failed to upload photo");
            }
          }
        }}
        className="px-6 py-4 flex flex-row gap-4 items-center"
      >
        <FileUpload
          file={profileFile}
          setFile={(file) => {
            setProfileFile(file);
            if (file) {
              setProfileImage(URL.createObjectURL(file));
            } else {
              setProfileImage(null);
            }
          }}
          imagePreview={profileImage}
        />
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            className=" min-w-[50px] whitespace-normal"
            disabled={!profileFile}
          >
            Save Photo
          </Button>
          <Button
            onClick={async () => {
              setProfileImage("");
              if (authorizedUser) {
                await updatePhoto("", authorizedUser?.id);
              }
            }}
            className="min-w-[50px] whitespace-normal bg-red-500 dark:bg-red-400 dark:hover:bg-red-300 hover:bg-red-400"
            disabled={!profileImage}
          >
            Remove Photo
          </Button>
        </div>
      </form>
      <form
        action={async (formData: FormData) => {
          const bio = formData.get("bio") as string;
          if (bio && authorizedUser?.id) {
            const result = await updateAuthorBio(bio, authorizedUser.id);
            if (result.success) {
              setBioValue(bio);
              toast.success("Bio updated successfully");
            } else {
              toast.error("Failed to update bio");
            }
          }
        }}
        className="px-6 py-4 flex flex-row gap-4 items-center"
      >
        <div className="w-[12%] mr-5 sm:mr-0">Bio:</div>
        <Textarea
          name="bio"
          value={bioValue}
          onChange={(e) => setBioValue(e.target.value)}
          placeholder="Enter your bio"
          className="w-[50%]"
        />
        <Button
          type="submit"
          className="min-w-[120px] dark:bg-slate-300 hidden sm:block"
        >
          Save Bio
        </Button>
        <Button
          type="submit"
          className="w-[13%] dark:bg-slate-300 p-0 sm:hidden"
        >
          <Check className="h-5 w-5" />
        </Button>
      </form>
      <form
        action={async (formData: FormData) => {
          const linkedin = formData.get("linkedin") as string;
          if (!isValidLinkedinUrl(linkedin) && linkedin !== "") {
            toast.error("Please enter a valid LinkedIn profile URL");
            return;
          }
          if (authorizedUser?.id) {
            const result = await updateLinkedin(linkedin, authorizedUser.id);
            if (result.success) {
              setLinkedinValue(linkedin);
              toast.success("LinkedIn URL updated successfully");
            } else {
              toast.error("Not a valid LinkedIn URL");
            }
          }
        }}
        className="px-6 py-4 flex flex-row gap-4 items-center"
      >
        <div className="w-[12%] mr-5 sm:mr-0">LinkedIn:</div>
        <Input
          name="linkedin"
          value={linkedinValue}
          onChange={(e) => setLinkedinValue(e.target.value)}
          placeholder="Enter your LinkedIn url"
          className="w-[50%]"
        />
        <Button
          type="submit"
          className="min-w-[120px] dark:bg-slate-300 hidden sm:block"
        >
          Save LinkedIn
        </Button>
        <Button
          type="submit"
          className="w-[13%] dark:bg-slate-300 p-0 sm:hidden"
        >
          <Check className="h-5 w-5" />
        </Button>
      </form>

      <form
        action={async (formData: FormData) => {
          const github = formData.get("github") as string;
          if (!isValidGithubUrl(github) && github !== "") {
            toast.error("Please enter a valid GitHub profile URL");
            return;
          }
          if (authorizedUser?.id) {
            const result = await updateGithub(github, authorizedUser.id);
            if (result.success) {
              setGithubValue(github);
              toast.success("GitHub URL updated successfully");
            } else {
              toast.error("Not a valid GitHub URL");
            }
          }
        }}
        className="px-6 py-4 flex flex-row gap-4 items-center"
      >
        {" "}
        <div className="w-[12%] mr-5 sm:mr-0">GitHub:</div>
        <Input
          name="github"
          value={githubValue}
          onChange={(e) => setGithubValue(e.target.value)}
          placeholder="Enter your GitHub url"
          className="w-[50%]"
        />
        <Button
          type="submit"
          className="min-w-[120px] dark:bg-slate-300 hidden sm:block"
        >
          Save GitHub
        </Button>
        <Button
          type="submit"
          className="w-[13%] dark:bg-slate-300 p-0 sm:hidden"
        >
          <Check className="h-5 w-5" />
        </Button>
      </form>
      <div className="p-4">
        <ProfileBlock
          user={authorizedUser}
          otherUser={authorizedUser}
          isOpen={open}
          setIsOpen={setOpen}
          isFeed={false}
          isProfile={true}
        />
      </div>
    </>
  );
}
