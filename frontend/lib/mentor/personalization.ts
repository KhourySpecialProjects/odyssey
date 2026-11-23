import "server-only";
import { readJsonOrNull } from "@/lib/strapi-response";
import { STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";

// Not a "use server" file: it trusts the userId it is given (ODY-935).
/** Whether this student lets Mentor personalize. Fails closed (false) on any error. */
export async function studentAllowsPersonalization(
  userId: number,
): Promise<boolean> {
  try {
    const query = `fields[0]=mentorPersonalization&pagination[pageSize]=1&filters[id][$eq]=${encodeURIComponent(String(userId))}`;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-users?${query}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
        },
        cache: "no-store",
      },
    );
    if (!response.ok) return false;
    const json = await readJsonOrNull(response);
    const row = json?.data?.[0];
    if (!row) return false;
    const value = (row.attributes ?? row).mentorPersonalization;
    return value !== false;
  } catch (error) {
    console.error("Mentor personalization lookup failed:", error);
    return false;
  }
}
