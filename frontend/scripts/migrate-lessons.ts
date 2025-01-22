/*
This script migrates lessons from the droplet model to the droplet-lesson model.

To run: npx tsx --env-file=.env.local scripts/migrate-lessons.ts
*/
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

interface Droplet {
  id: number;
  attributes: {
    lessons?: {
      data?: Array<{
        id: number;
        attributes: {
          name: string;
          slug: string;
        };
      }>;
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

  // Add query params if they exist
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

async function migrateDropletLessons() {
  try {
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      console.log(`Fetching page ${page}`);

      const dropletsResponse = (await fetchAPI("/droplets", {
        method: "GET",
        params: {
          "populate[lessons]": "*",
          "pagination[page]": page,
          "pagination[pageSize]": 100,
        },
      })) as StrapiResponse<Droplet[]>;

      const droplets = dropletsResponse.data;
      totalPages = dropletsResponse.meta.pagination.pageCount;

      console.log(`Processing ${droplets.length} droplets`);

      for (const droplet of droplets) {
        console.log(`Droplet ID: ${droplet.id}`);

        // Safely access lessons
        const lessons = droplet.attributes.lessons?.data || [];
        console.log(`Droplet has ${lessons.length} lessons`);

        for (let i = 0; i < lessons.length; i++) {
          const lesson = lessons[i];

          try {
            const response = await fetchAPI("/droplet-lessons", {
              method: "POST",
              body: JSON.stringify({
                data: {
                  droplet: droplet.id,
                  lesson: lesson.id,
                  orderIndex: i,
                },
              }),
            });

            console.log(
              `Created DropletLesson for Droplet ${droplet.id}, Lesson ${lesson.id}, Order ${i}`,
            );
          } catch (createError) {
            console.error(
              `Error creating DropletLesson for Droplet ${droplet.id}, Lesson ${lesson.id}:`,
              createError,
            );
          }
        }
      }

      page++;
    }

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

migrateDropletLessons();
