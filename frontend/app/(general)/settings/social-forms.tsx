"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateGithub, updateLinkedin, updatePhoto, uploadImage } from "@/lib/actions";
import { AuthorizedUser } from "@/types";
import { useState } from "react";
import imageCompression from "browser-image-compression";

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

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];

    if (file && file.type.startsWith("image/")) {
      const compressedFile = await compressImage(file); // Compress before storing
      setProfileFile(compressedFile);
      setProfileImage(URL.createObjectURL(compressedFile));
    } else {
      toast.error("Please upload a valid image file");
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const compressedFile = await compressImage(file); // Compress the image
      setProfileFile(compressedFile);
      setProfileImage(URL.createObjectURL(compressedFile));
    } else {
      toast.error("Please upload a valid image file");
    }
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
        className={`flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer 
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 border-dashed"}`}
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
          <p className="text-gray-500 mb-4">
            Drag & drop to update your profile photo here
          </p>
        )}
        
        <label className="bg-blue-500 text-white py-2 px-4 rounded cursor-pointer">
          {file ? "Change Photo" : "Upload Photo"}
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
        action={async (formData: FormData) => {
          if (profileFile && authorizedUser?.id) {
            const newFormData: FormData = new FormData();
            newFormData.append("image", profileFile as Blob);
      
            const response = await uploadImage(newFormData);
            if (response.ok && response.url) {
              setProfileImage(response.url);
              const updateResult = await updatePhoto(response.url, authorizedUser.id);
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
        <Button type="submit" className="max-w-80" disabled={!profileFile}>
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
