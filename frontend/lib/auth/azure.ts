import { User } from "@/types";

type UserProfile = Omit<User, "roles">;

export async function getUserProfile(
  accessToken: string,
): Promise<UserProfile> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me?$select=employeeId",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    const data = await response.json();

    const { employeeId } = data;
    return { nuid: employeeId, isActive: true };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Microsoft Graph profile request timed out");
    } else {
      console.error("Error fetching user profile:", error);
    }
    throw new Error("Failed to fetch user profile");
  }
}

export async function getUserPhoto(
  accessToken: string,
): Promise<Buffer | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/photos/120x120/$value",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("Microsoft Graph photo request timed out");
    }
    return null;
  }
}
