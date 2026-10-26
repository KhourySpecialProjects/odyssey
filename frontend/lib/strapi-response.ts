/** Strapi v5 DELETE returns 204 with no body; returns null then, else the parsed JSON. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readJsonOrNull<T = any>(
  response: Response,
): Promise<T | null> {
  if (response.status === 204) return null;
  return response.json();
}
