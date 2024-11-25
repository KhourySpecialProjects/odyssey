import { fetchAPI } from "../utils";
import { StrapiRequestParams } from "@/types/strapi";
import { AuthorizedUserActivity } from "@/types";

export async function getAuthorizedUserActivity(
  authorizedUserId: number,
  { populate = { lessons: true } }: StrapiRequestParams = {}
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

  return await fetchAPI<AuthorizedUserActivity[]>(path, { urlParams }).then(activities => activities[0] || null);
}

export async function updateCompletedLessons(activityId: number, lessonIds: number[]) {
  const path = `/authorized-user-activities/${activityId}`;
  const urlParams = {};
  const data = {
    data: {
      lessons: lessonIds,
    },
  };

  return await fetchAPI<AuthorizedUserActivity>(path, { urlParams, options: { method: "PUT", body: JSON.stringify(data) } });
} 