"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { useState, useRef, useEffect } from "react";
import { ImageIcon, Upload, X, Loader2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage } from "@/lib/actions";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";

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

export const ImageBlock = createReactBlockSpec(
  {
    type: "image",
    propSchema: {
      url: {
        default: "",
      },
      caption: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      const [isEditing, setIsEditing] = useState(false);
      const [imageUrl, setImageUrl] = useState(props.block?.props?.url || "");
      const [caption, setCaption] = useState(props.block?.props?.caption || "");
      const [uploading, setUploading] = useState(false);
      const [isReady, setIsReady] = useState(false);
      const fileInputRef = useRef<HTMLInputElement>(null);
      const isMountedRef = useRef(true);

      // Early return if editor or block is not ready
      if (!props.editor || !props.block) {
        return null;
      }

      // Mounting check - delay rendering to ensure editor is fully initialized
      useEffect(() => {
        setIsReady(false);
        isMountedRef.current = true;
        // Delay to ensure BlockNote editor is fully mounted
        const timer = setTimeout(() => {
          if (isMountedRef.current) {
            setIsReady(true);
          }
        }, 0); // Already delayed at BlockNoteEditorClient level

        return () => {
          isMountedRef.current = false;
          clearTimeout(timer);
        };
      }, []);

      useEffect(() => {
        if (!isMountedRef.current || !isReady) return;
        setImageUrl(props.block?.props?.url || "");
        setCaption(props.block?.props?.caption || "");
      }, [props.block?.props?.url, props.block?.props?.caption, isReady]);

      // Removed auto-open on reload - user must click Edit button to open dialog

      // Don't render until ready to avoid "Cannot find node position" errors
      if (!isReady) {
        return (
          <div
            className="relative my-4 rounded-md border border-slate-200 bg-slate-50 p-4 select-none dark:border-slate-700 dark:bg-slate-800"
            contentEditable={false}
            data-content-type="image"
            style={{
              userSelect: "none",
              WebkitUserSelect: "none",
              cursor: "default",
              minHeight: "150px",
            }}
          >
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 text-slate-400">
                <ImageIcon size={16} />
                <span className="text-sm">Loading...</span>
              </div>
            </div>
          </div>
        );
      }

      const handleFileSelect = async (
        e: React.ChangeEvent<HTMLInputElement>,
      ) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith("image/")) {
          toast.error("Please select a valid image file");
          return;
        }

        setUploading(true);
        try {
          const compressedFile = await compressImage(file);
          const formData = new FormData();
          formData.append("image", compressedFile);

          const response = await uploadImage(formData);
          if (response.ok && response.url) {
            setImageUrl(response.url);
            toast.success("Image uploaded successfully");
          } else {
            toast.error(response.error || "Failed to upload image");
          }
        } catch (error) {
          console.error("Upload error:", error);
          toast.error("Failed to upload image");
        } finally {
          setUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };

      const handleSave = () => {
        // Safety checks before updating
        if (!isMountedRef.current || !props.editor || !props.block) {
          return;
        }

        if (!imageUrl.trim()) {
          toast.error("Please provide an image URL or upload an image");
          return;
        }

        try {
          props.editor.updateBlock(props.block, {
            props: {
              url: imageUrl.trim(),
              caption: caption.trim(),
            },
          });
          if (isMountedRef.current) {
            setIsEditing(false);
          }
        } catch (error) {
          if (
            error instanceof Error &&
            (error.message.includes("node position") ||
              error.message.includes("Cannot find") ||
              error.message.includes("not mounted"))
          ) {
            return;
          }
          console.error("Error updating block:", error);
          if (isMountedRef.current) {
            toast.error("Failed to save image");
          }
        }
      };

      const handleCancel = () => {
        if (!isMountedRef.current) return;
        setImageUrl(props.block?.props?.url || "");
        setCaption(props.block?.props?.caption || "");
        setIsEditing(false);
      };

      try {
        return (
          <div
            className="relative my-4 rounded-md border border-slate-200 bg-slate-50 p-4 select-none dark:border-slate-700 dark:bg-slate-800"
            contentEditable={false}
            data-content-type="image"
            onMouseDown={(e) => {
              e.preventDefault();
              if ((e.target as HTMLElement).closest("button")) {
                return;
              }
            }}
            style={{
              userSelect: "none",
              WebkitUserSelect: "none",
              cursor: "default",
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className="text-slate-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Image
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isMountedRef.current && isReady) {
                    setIsEditing(true);
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="h-7 px-2"
              >
                <Edit2 size={14} className="mr-1" />
                Edit
              </Button>
            </div>

            {props.block?.props?.url ? (
              <div className="space-y-2">
                <img
                  src={props.block?.props?.url || ""}
                  alt={caption || "Image"}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                />
                {caption && (
                  <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                    {caption}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex min-h-[150px] items-center justify-center rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600">
                <div className="text-center">
                  <ImageIcon className="mx-auto mb-2 h-12 w-12 text-slate-400" />
                  <p className="text-sm text-slate-500">
                    Click Edit to add image
                  </p>
                </div>
              </div>
            )}

            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogContent
                className="max-w-2xl"
                onInteractOutside={(e) => {
                  e.preventDefault();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onOpenAutoFocus={(e) => {
                  // Prevent auto-focus to avoid flushSync errors during render cycles
                  e.preventDefault();
                }}
              >
                <DialogHeader>
                  <DialogTitle>Edit Image</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="image-upload">Upload Image</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Choose File
                          </>
                        )}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image-url">Or enter image URL</Label>
                    <Input
                      id="image-url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image-caption">Caption (optional)</Label>
                    <Input
                      id="image-caption"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Image caption"
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>

                  {imageUrl && (
                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <div className="rounded-md border border-slate-200 p-4 dark:border-slate-700">
                        <img
                          src={imageUrl}
                          alt="Preview"
                          className="max-h-48 w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes("node position") ||
            error.message.includes("Cannot find") ||
            error.message.includes("not mounted"))
        ) {
          return null;
        }
        console.error("ImageBlock render error:", error);
        return null;
      }
    },
  },
);
