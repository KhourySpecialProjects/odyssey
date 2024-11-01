import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { AuthorizedUserRole } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";
import qs from "qs";

export async function getAuthorizedUserRoleIdByTitle(
  title: string,
  { sort, filters, populate, fields = ["*"] }: StrapiRequestParams = {},
): Promise<number> {
  const path = `/authorized-user-roles`;
  const urlParams = {
    sort,
    filters: {
      ...filters,
      title: { $eq: title },
    },
    populate,
    fields,
    pagination: {
      pageSize: 1,
      page: 1,
    },
  };

  return await fetchAPI<AuthorizedUserRole[]>(path, { urlParams }).then(
    (roles) => roles[0].id,
  );
}
