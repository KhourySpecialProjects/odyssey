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

// Cache the dynamic import so we don't re-import per image
let _compressionModule: Promise<
  typeof import("browser-image-compression")
> | null = null;

async function getCompressionModule() {
  if (!_compressionModule) {
    _compressionModule = import("browser-image-compression");
  }
  return (await _compressionModule).default;
}

/**
 * Upload extracted images (parallelized), resolve placeholders in blocks,
 * then sequentially create lessons.
 */
export async function createLessonsFromImport(
  params: CreateLessonsParams,
): Promise<CreateLessonsResult> {
  const { dropletId, startOrderIndex, lessons, images, onProgress } = params;

  // Step 1: Upload images in parallel (batches of 5 to avoid overwhelming)
  const urlMap = new Map<string, string>();
  if (images && images.size > 0) {
    const imageEntries = Array.from(images.entries());
    const BATCH_SIZE = 5;

    for (let batch = 0; batch < imageEntries.length; batch += BATCH_SIZE) {
      const batchEntries = imageEntries.slice(batch, batch + BATCH_SIZE);
      const results = await Promise.all(
        batchEntries.map(async ([id, img]) => {
          try {
            const compressed = await compressImage(img.blob);
            const formData = new FormData();
            formData.append("image", compressed, img.fileName);
            const result = await uploadImage(formData);
            if (result.ok && result.url) {
              return { id, url: result.url };
            }
          } catch (err) {
            console.warn(`Image upload failed for ${img.fileName}:`, err);
          }
          return null;
        }),
      );

      for (const r of results) {
        if (r) urlMap.set(`IMPORT_IMG_${r.id}`, r.url);
      }

      onProgress?.(
        Math.min(batch + BATCH_SIZE, imageEntries.length),
        imageEntries.length,
        "Uploading images",
      );
    }
  }

  // Step 2: Resolve image placeholders immutably
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
 * Replace IMPORT_IMG_ placeholders with real S3 URLs.
 * Returns new array — does not mutate input.
 */
function resolveImageUrls(
  blocks: CustomBlockNoteBlock[],
  urlMap: Map<string, string>,
): CustomBlockNoteBlock[] {
  return blocks
    .map((block) => {
      if (
        block.type === "image" &&
        block.props?.url?.startsWith("IMPORT_IMG_")
      ) {
        const realUrl = urlMap.get(block.props.url);
        if (realUrl) {
          return { ...block, props: { ...block.props, url: realUrl } };
        }
        return null; // Remove failed image blocks
      }
      return block;
    })
    .filter((b): b is CustomBlockNoteBlock => b !== null);
}

async function compressImage(blob: Blob): Promise<Blob> {
  try {
    const imageCompression = await getCompressionModule();
    const file = new File([blob], "image.jpg", { type: blob.type });
    return await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    });
  } catch {
    return blob;
  }
}
