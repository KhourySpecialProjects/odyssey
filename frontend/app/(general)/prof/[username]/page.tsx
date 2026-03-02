import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { USER_POPULATES } from "@/lib/requests/user-populates";
import { AuthorizedUser, Enrollment } from "@/types";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { fetchFriends } from "@/lib/requests/friends";
import { fetchUserAnnouncements } from "@/lib/requests/feed";
import { getCurrentUser } from "@/lib/auth/session";
import { ProfileContent } from "./profile-content";
import { PrivateProfileError } from "./private-profile-error";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  try {
    const userEmail = username + "@northeastern.edu";
    const currentUser = await getCurrentUser();
    const userData: AuthorizedUser = await getAuthorizedUserByEmail(userEmail, {
      fields: [...USER_POPULATES.social.fields],
      populate: {
        ...USER_POPULATES.social.populate,
        droplets: { fields: ["*"] },
      },
    });
    const isViewingOwnProfile = currentUser?.email === userEmail;

    if (!userData.isPublic && !isViewingOwnProfile) {
      return <PrivateProfileError />;
    }

    // Fetch profile data
    const [enrollments, friends, announcements] = await Promise.all([
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
      fetchFriends(userData),
      fetchUserAnnouncements(userData.id),
    ]);

    // Get current user data if logged in and not viewing own profile
    let currentUserCompletedIds: number[] = [];
    let currentUserData: AuthorizedUser | null = null;

    if (currentUser?.email) {
      try {
        const maybeUserData = await getAuthorizedUserByEmail(
          currentUser.email,
          USER_POPULATES.social,
        );
        if (!maybeUserData || typeof maybeUserData.id !== "number") {
          throw new Error("Current user data is missing a valid id");
        }
        currentUserData = maybeUserData;

        if (!isViewingOwnProfile) {
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

          currentUserCompletedIds = (currentUserEnrollments || [])
            .filter((enrollment: Enrollment) => enrollment.isComplete)
            .map((enrollment: Enrollment) => enrollment.droplet.id);
        }
      } catch (error) {
        console.error("Error fetching current user data:", error);
      }
    }

    return (
      <ProfileContent
        userData={userData}
        enrollments={enrollments || []}
        friends={friends || []}
        announcements={announcements || []}
        currentUserCompletedIds={currentUserCompletedIds}
        isViewingOwnProfile={isViewingOwnProfile}
        currentUser={currentUserData}
      />
    );
  } catch (error) {
    console.error("Error loading profile:", error);

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
