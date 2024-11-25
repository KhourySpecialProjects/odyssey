import { fetchAPI } from "../utils";
import { StrapiRequestParams } from "@/types/strapi";
import { AuthorizedUserActivity } from "@/types";

export async function getAuthorizedUserActivity(
  authorizedUserId: number,
  { populate = { 
    lessons: {
      fields: ['id', 'name', 'slug']
    },
    authorized_user: {
      fields: ['id', 'email']
    }
  } }: StrapiRequestParams = {}
): Promise<AuthorizedUserActivity | null> {
  const path = `/authorized-user-activities`;
  const urlParams = {
    filters: {
      authorized_user: { id: { $eq: authorizedUserId } },
    },
    populate,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  return await fetchAPI<AuthorizedUserActivity[]>(path, { 
    urlParams,
    cache: 'no-store' // Disable caching to always get fresh data
  }).then(activities => activities[0] || null);
}

export async function updateCompletedLessons(activityId: number, lessonIds: number[]) {
  const path = `/authorized-user-activities/${activityId}`;
  const data = {
    data: {
      lessons: lessonIds,
    },
  };

  return await fetchAPI<AuthorizedUserActivity>(path, { 
    options: { 
      method: "PUT", 
      body: JSON.stringify(data) 
    },
    cache: 'no-store'
  });
} 