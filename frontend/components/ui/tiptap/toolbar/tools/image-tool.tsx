"use client";
import { Editor } from "@tiptap/react";
import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowUpToLineIcon,
  LoaderIcon,
  XIcon,
  ImagePlusIcon,
} from "lucide-react";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { uploadImage } from "@/lib/actions";
import { cn } from "@/lib/utils";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";

export default function ImageToolButton({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const insertImage = async (prevState: any, formData: FormData) => {
    const newFormData: FormData = new FormData();
    newFormData.append("image", file as Blob);

    const response = await uploadImage(newFormData);
    if (response.ok && response.url) {
      editor
        ?.chain()
        .focus()
        .setImage({ src: response.url })
        .createParagraphNear()
        .focus()
        .run();
      setFile(null);
    }
    setOpen(false);
    setFile(null);
    console.log(response);
  };

  const initialState: any = { image: null };

  const [state, formAction, isPending] = useActionState(
    insertImage,
    initialState,
  );

  const disabled = !(
    editor?.view?.state.selection.$from.node().type.name == "doc" ||
    editor?.view?.state.selection.$from.node(-1).type.name == "doc"
  );

  return (
    <Popover open={open}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          onClick={() => {
            setOpen(!open);
            editor?.chain().focus().run();
          }}
          className={cn(
            disabled ? "" : "hover:border-slate-200",
            "p-2.5 rounded-md border border-transparent",
          )}
          title="Image"
        >
          <ImagePlusIcon size={17} />
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <form action={formAction} role="form">
          <FileUpload file={file} setFile={setFile} />

          <div className="w-full flex justify-between items-center">
            <PopoverClose onClick={() => setOpen(false)} asChild>
              <Button before={<XIcon />} className="m-2">
                Close
              </Button>
            </PopoverClose>
            <Button
              after={
                isPending ? (
                  <LoaderIcon className="animate-spin" />
                ) : (
                  <ArrowUpToLineIcon />
                )
              }
              variant="outline"
              type="submit"
            >
              Upload
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
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
}: {
  file: File | null;
  setFile: (file: File | null) => void;
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
      className={`flex flex-col items-center max-w-xs mx-auto p-4 border-2 rounded-lg cursor-pointer 
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 border-dashed"}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <label className="bg-blue-500 text-white py-2 px-4 rounded mb-4 cursor-pointer">
        {file ? "Change File" : "Upload or Drag File Here"}
        <input
          name="image"
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {file && (
        <div className="flex items-center justify-between w-full">
          <span className="truncate flex-grow">{file.name}</span>
          <button
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
