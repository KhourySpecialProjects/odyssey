import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { AuthorizedUser, Enrollment } from "@/types";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { fetchFriends } from "@/lib/requests/friends";
import { fetchUserAnnouncements } from "@/lib/requests/feed";
import { getCurrentUser } from "@/lib/auth/session";
import { ProfileContent } from "./profile-content";
import { PrivateProfileError } from "./private-profile-error";

/**
 * PublicProfilePage - Server Component
 *
 * Fetches all necessary data on the server side:
 * - Profile user data (from URL parameter)
 * - Current logged-in user (to check completion status)
 * - Enrollments, friends, and announcements
 *
 * Then passes all data as props to the ProfileContent client component
 */
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  try {
    const userEmail = username + "@northeastern.edu";
    const currentUser = await getCurrentUser();
    const userData: AuthorizedUser = await getAuthorizedUserByEmail(userEmail);
    const isViewingOwnProfile = currentUser?.email === userEmail;

    // Replace the entire if block with this:
    if (!userData.isPublic && !isViewingOwnProfile) {
      return <PrivateProfileError />;
    }
    // Fetch all profile data in parallel for better performance
    const [enrollments, friends, announcements] = await Promise.all([
      // Fetch profile user's enrollments
      getEnrollmentsByAuthorizedUser(userData.id, {
        populate: {
          viewedLessons: {
            fields: ["id", "name", "slug"],
          },
          droplet: {
            populate: {
              lessons: {
                fields: ["id", "name", "slug"],
              },
            },
          },
        },
      }),
      // Fetch profile user's friends
      fetchFriends(userData),
      // Fetch profile user's recent announcements
      fetchUserAnnouncements(userData.id),
    ]);

    // Get current user's completed droplets for completion badges
    let currentUserCompletedIds: number[] = [];

    if (currentUser?.email && !isViewingOwnProfile) {
      try {
        const currentUserData = await getAuthorizedUserByEmail(
          currentUser.email,
        );
        const currentUserEnrollments = await getEnrollmentsByAuthorizedUser(
          currentUserData.id,
          {
            populate: {
              droplet: {
                fields: ["id"],
              },
            },
          },
        );

        // Extract IDs of droplets the current user has completed
        currentUserCompletedIds = (currentUserEnrollments || [])
          .filter((enrollment: Enrollment) => enrollment.isComplete)
          .map((enrollment: Enrollment) => enrollment.droplet.id);
      } catch (error) {
        console.error("Error fetching current user data:", error);
        // Continue without completion badges if there's an error
      }
    }

    // Render the client component with all fetched data
    return (
      <ProfileContent
        userData={userData}
        enrollments={enrollments || []}
        friends={friends || []}
        announcements={announcements || []}
        currentUserCompletedIds={currentUserCompletedIds}
        isViewingOwnProfile={isViewingOwnProfile}
      />
    );
  } catch (error) {
    console.error("Error loading profile:", error);

    // Error state
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-800 dark:text-gray-200">
            Profile Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This profile is either private or does not exist.
          </p>
        </div>
      </div>
    );
  }
}
