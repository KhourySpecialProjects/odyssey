import { clsx, type ClassValue } from "clsx";
import { parse } from "node-html-parser";
import qs from "qs";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStrapiURL(path = "") {
  return `${process.env.STRAPI_API_URL || "http://localhost:1337"}${path}`;
}

export async function fetchAPI(
  path: string,
  urlParams = {},
  options = {},
  revalidate: number = 60
) {
  try {
    // Merge default and user options
    const mergedOptions = {
      next: { revalidate },
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.STRAPI_ACCESS_TOKEN,
      },
      ...options,
    };

    // Build request URL
    const queryString = qs.stringify(urlParams);
    const requestUrl = `${getStrapiURL(
      `/api${path}${queryString ? `?${queryString}` : ""}`
    )}`;

    // Trigger API call
    const response = await fetch(requestUrl, mergedOptions);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    throw new Error(
      `Please check if your server is running and you set all the required tokens.`
    );
  }
}

export function flattenAttributes(data: any): any {
  // Base case for recursion
  if (!data) return null;

  // Handling array data
  if (Array.isArray(data)) {
    return data.map(flattenAttributes);
  }

  let flattened: { [key: string]: any } = {};

  // Handling attributes
  if (data.attributes) {
    for (let key in data.attributes) {
      if (
        typeof data.attributes[key] === "object" &&
        data.attributes[key] !== null &&
        "data" in data.attributes[key]
      ) {
        flattened[key] = flattenAttributes(data.attributes[key].data);
      } else {
        flattened[key] = data.attributes[key];
      }
    }
  }

  // Copying non-attributes and non-data properties
  for (let key in data) {
    if (key !== "attributes" && key !== "data") {
      flattened[key] = data[key];
    }
  }

  // Handling nested data
  if (data.data) {
    flattened = { ...flattened, ...flattenAttributes(data.data) };
  }

  return flattened;
}

export function extractHeadings(html: string): any[] {
  if (!html || html.length === 0) return [];

  const root = parse(html);
  const headings = Array.from(
    root.querySelectorAll("h1, h2, h3, h4, h5, h6")
  ).map((heading) => ({
    level: parseInt(heading.tagName[1]),
    text: heading.textContent?.trim(),
  }));

  return headings;
}
