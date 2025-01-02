import { User } from "@/types";

type UserProfile = Omit<User, "roles">;

export async function getUserProfile(
  accessToken: string
): Promise<UserProfile> {
  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me?$select=employeeId",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    // Extract relevant information from the response
    const { employeeId } = data;
    // return { nuid: employeeId };
    // TODO: Not sure why the build is only now requiring the isActive attribute???
    return { nuid: employeeId, isActive: true };
  } catch (error) {
    // Handle errors appropriately
    console.error("Error fetching user profile:", error);
    throw new Error("Failed to fetch user profile");
  }
}
