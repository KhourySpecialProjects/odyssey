import { User } from "@/types";

type UserProfile = Omit<User, "isAdmin">;

export async function getUserProfile(
  accessToken: string
): Promise<UserProfile> {
  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me?$select=employeeId,jobTitle",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    // Extract relevant information from the response
    const { employeeId, jobTitle } = data;
    return { employeeId, jobTitle };
  } catch (error) {
    // Handle errors appropriately
    console.error("Error fetching user profile:", error);
    throw new Error("Failed to fetch user profile");
  }
}
