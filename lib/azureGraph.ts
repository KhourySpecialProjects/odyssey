import axios from "axios";

export async function getUserProfile(accessToken: string) {
  try {
    const response = await axios.get(
      "https://graph.microsoft.com/v1.0/me?$select=employeeId,jobTitle",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // Extract relevant information from the response
    const { employeeId, jobTitle } = response.data;
    return { employeeId, jobTitle };
  } catch (error) {
    // Handle errors appropriately
    console.error("Error fetching user profile:");
    throw new Error("Failed to fetch user profile");
  }
}
