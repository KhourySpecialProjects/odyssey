import { fetchAPI } from "./utils";

type PopulateValue =
  | string
  | {
      [key: string]: PopulateValue;
    };

export async function getDropletBySlug(slug: string, populate?: PopulateValue) {
  const path = `/droplets`;
  const urlParamsObject = {
    filters: { slug },
    populate,
  };

  return await fetchAPI(path, urlParamsObject);
}
