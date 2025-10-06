import { fetchAPI } from "../utils";

// create a favorite by droplet id
export async function createFavorite(
  dropletId: number,
): Promise<{ id: number }> {
  const path = `/favorites`;

  return await fetchAPI(path, {
    options: {
      method: "POST",
      body: JSON.stringify({ data: { droplet: dropletId } }),
    },
  });
}

// delete a favorite by favorite id
export async function deleteFavorite(favoriteId: number): Promise<void> {
  const path = `/favorites/${favoriteId}`;

  await fetchAPI(path, {
    options: {
      method: "DELETE",
    },
  });
}

// get all favorites for the current user
export async function getFavorites() {
  const path = `/favorites`;
  const urlParams = {
    populate: {
      droplet: {
        populate: ["tags", "lessons"],
      },
    },
    pagination: {
      pageSize: 100,
      page: 1,
    },
    sort: ["createdAt:desc"],
  };

  return await fetchAPI<
    {
      id: number;
      droplet: {
        id: number;
        name: string;
        slug: string;
        tags: any[];
        lessons: any[];
      };
    }[]
  >(path, { urlParams });
}

// check if a droplet is favorited by droplet id
export async function checkIsFavorited(dropletId: number): Promise<boolean> {
  const path = `/favorites`;
  const urlParams = {
    filters: {
      droplet: { id: dropletId },
    },
  };

  const response = await fetchAPI<any[]>(path, { urlParams });
  return Array.isArray(response) && response.length > 0;
}
