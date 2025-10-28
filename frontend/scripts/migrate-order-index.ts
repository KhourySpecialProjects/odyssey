/*
This script migrates orderIndex from droplet-lessons to their corresponding lessons.

To run: npx tsx --env-file=.env.local scripts/migrate-order-index.ts from within the frontend directory
*/
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

interface DropletLesson {
  id: number;
  attributes: {
    orderIndex: number;
    droplet: {
      data: {
        id: number;
      };
    };
    lesson: {
      data: {
        id: number;
        attributes: {
          name: string;
          orderIndex?: number;
        };
      };
    };
  };
}

interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

async function fetchAPI(path: string, options: any = {}) {
  const defaultOptions = {
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      "Content-Type": "application/json",
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
  };

  const url = new URL(`${STRAPI_URL}/api${path}`);

  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  const response = await fetch(url, {
    ...mergedOptions,
    method: mergedOptions.method || "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error: ${response.status} ${response.statusText}`);
    console.error("Response body:", errorText);
    throw new Error(`API request failed: ${response.status}`);
  }

  return await response.json();
}

async function migrateOrderIndex() {
  try {
    let page = 1;
    let totalPages = 1;
    let updatedCount = 0;

    console.log(
      "Starting migration of orderIndex from droplet-lessons to lessons...",
    );

    while (page <= totalPages) {
      // Fetch all droplet-lessons with their orderIndex and related lesson data
      const dropletLessonsResponse = (await fetchAPI("/droplet-lessons", {
        method: "GET",
        params: {
          "populate[lesson]": "*",
          "populate[droplet]": "id",
          "pagination[page]": page,
          "pagination[pageSize]": 100,
        },
      })) as StrapiResponse<DropletLesson[]>;

      const dropletLessons = dropletLessonsResponse.data;
      totalPages = dropletLessonsResponse.meta.pagination.pageCount;

      console.log(
        `Processing page ${page} of ${totalPages} (${dropletLessons.length} droplet-lessons)`,
      );

      for (const dropletLesson of dropletLessons) {
        const { orderIndex, lesson } = dropletLesson.attributes;
        const lessonId = lesson.data.id;
        const lessonName = lesson.data.attributes.name;
        const currentOrderIndex = lesson.data.attributes.orderIndex;

        try {
          // Update the lesson's orderIndex to match the droplet-lesson's orderIndex
          await fetchAPI(`/lessons/${lessonId}`, {
            method: "PUT",
            body: JSON.stringify({
              data: {
                orderIndex: orderIndex,
              },
            }),
          });

          console.log(
            `Updated Lesson "${lessonName}" (ID: ${lessonId}) orderIndex: ${currentOrderIndex} → ${orderIndex}`,
          );
          updatedCount++;
        } catch (updateError) {
          console.error(
            `Error updating Lesson "${lessonName}" (ID: ${lessonId}) orderIndex:`,
            updateError,
          );
        }
      }

      page++;
    }

    console.log(`\n Migration completed! Updated ${updatedCount} lessons.`);
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

migrateOrderIndex();
