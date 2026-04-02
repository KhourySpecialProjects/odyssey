import type { CustomBlockNoteBlock, Lesson } from "@/types";
import type { ImportImage } from "./types";
import { addLesson } from "@/lib/requests/lesson";
import { uploadImage } from "@/lib/actions";

export interface CreateLessonsParams {
  dropletId: number;
  startOrderIndex: number;
  lessons: Array<{
    title: string;
    blocks: CustomBlockNoteBlock[];
  }>;
  images?: Map<string, ImportImage>;
  onProgress?: (current: number, total: number, stage: string) => void;
}

export interface CreateLessonsResult {
  created: Lesson[];
  errors: Array<{ index: number; error: string }>;
}

/**
 * Upload extracted images and resolve placeholder URLs in blocks,
 * then sequentially create lessons.
 */
export async function createLessonsFromImport(
  params: CreateLessonsParams,
): Promise<CreateLessonsResult> {
  const { dropletId, startOrderIndex, lessons, images, onProgress } = params;

  // Step 1: Upload images and build URL map
  const urlMap = new Map<string, string>();
  if (images && images.size > 0) {
    const imageEntries = Array.from(images.entries());
    for (let i = 0; i < imageEntries.length; i++) {
      const [id, img] = imageEntries[i];
      onProgress?.(i + 1, imageEntries.length, "Uploading images");

      try {
        const compressed = await compressImage(img.blob);
        const formData = new FormData();
        formData.append("image", compressed, img.fileName);
        const result = await uploadImage(formData);
        if (result.ok && result.url) {
          urlMap.set(`IMPORT_IMG_${id}`, result.url);
        }
      } catch {
        // Image upload failed — will be removed from blocks
      }
    }
  }

  // Step 2: Resolve image placeholders in all blocks
  const resolvedLessons = lessons.map((lesson) => ({
    ...lesson,
    blocks: resolveImageUrls(lesson.blocks, urlMap),
  }));

  // Step 3: Create lessons sequentially
  const created: Lesson[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < resolvedLessons.length; i++) {
    const lesson = resolvedLessons[i];
    const orderIndex = startOrderIndex + i;

    onProgress?.(i + 1, resolvedLessons.length, "Creating lessons");

    try {
      const response = await addLesson({
        name: lesson.title,
        dropletId,
        orderIndex,
        blocksV2: lesson.blocks,
        blocksVersion: "v2",
      });

      if (!response || response.error) {
        errors.push({
          index: i,
          error: response?.error ?? "Unknown error creating lesson",
        });
        continue;
      }

      const data = response.data;
      const newLesson: Lesson = {
        id: data.id,
        name: data.attributes.name,
        slug: data.attributes.slug,
        type: data.attributes.type || "general",
        blocks: [],
        blocksV2: lesson.blocks,
        blocksVersion: "v2",
        droplets: [],
        notes: "",
        orderIndex,
      };

      created.push(newLesson);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unexpected error";
      errors.push({ index: i, error: errorMessage });
    }
  }

  return { created, errors };
}

/**
 * Walk blocks and replace IMPORT_IMG_ placeholder URLs with real S3 URLs.
 * Remove image blocks whose images failed to upload.
 */
function resolveImageUrls(
  blocks: CustomBlockNoteBlock[],
  urlMap: Map<string, string>,
): CustomBlockNoteBlock[] {
  return blocks.filter((block) => {
    if (block.type === "image" && block.props?.url?.startsWith("IMPORT_IMG_")) {
      const realUrl = urlMap.get(block.props.url);
      if (realUrl) {
        block.props.url = realUrl;
        return true;
      }
      return false; // Remove failed image blocks
    }
    return true;
  });
}

/**
 * Compress an image blob using browser-image-compression.
 */
async function compressImage(blob: Blob): Promise<Blob> {
  try {
    const imageCompression = (await import("browser-image-compression"))
      .default;
    const file = new File([blob], "image.jpg", { type: blob.type });
    return await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    });
  } catch {
    return blob; // Return original if compression fails
  }
}
