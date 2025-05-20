"use client";
import { Editor } from "@tiptap/react";
import { useRef, useState } from "react";
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
import { useOffClick } from "@/components/draft/metadata/hooks/useOffClick";

export default function ImageToolButton({ editor }: { editor: Editor | null }) {
  const ref = useRef(null);
  const { open, setOpen } = useOffClick(ref);
  const [file, setFile] = useState<File | null>(null);

  const insertImage = async () => {
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
  };

  const initialState: any = { image: null };

  const [, formAction, isPending] = useActionState(insertImage, initialState);

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
            "rounded-md border border-transparent p-2.5",
          )}
          title="Image"
        >
          <ImagePlusIcon size={17} />
        </button>
      </PopoverTrigger>
      <PopoverContent ref={ref}>
        <form action={formAction} role="form">
          <FileUpload file={file} setFile={setFile} />

          <div className="flex w-full items-center justify-between">
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
      className={`mx-auto flex max-w-xs cursor-pointer flex-col items-center rounded-lg border-2 p-4 ${isDragging ? "border-blue-500 bg-blue-50" : "border-dashed border-gray-300"}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <label className="mb-4 cursor-pointer rounded bg-blue-500 px-4 py-2 text-white" role="textbox">
        {file ? "Change File" : "Upload or Drag File Here"}
        <input
          name="image"
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {file && (
        <div className="flex w-full items-center justify-between">
          <span className="flex-grow truncate">{file.name}</span>
          <button
            className="ml-2 rounded bg-red-500 px-2 py-1 text-white"
            onClick={handleRemoveFile}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};
