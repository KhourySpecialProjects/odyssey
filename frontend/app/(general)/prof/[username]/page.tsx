import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { USER_POPULATES } from "@/lib/requests/user-populates";
import { getCachedUserSocial } from "@/lib/requests/cached";
import { AuthorizedUser, Enrollment } from "@/types";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { fetchFriends } from "@/lib/requests/friends";
import { fetchUserAnnouncements } from "@/lib/requests/feed";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserId } from "@/lib/auth/current-user-id";
import { isAuthorizedUserAdmin } from "@/lib/utils";
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
    const isViewingOwnProfile = currentUser?.email === userEmail;

    // The viewer's own data depends only on the session, so start it now
    // instead of after the profile's data. It never rejects.
    const viewerDataPromise = getViewerData(currentUser, isViewingOwnProfile);

    const userData = (await getAuthorizedUserByEmail(userEmail, {
      fields: [...USER_POPULATES.social.fields],
      populate: {
        ...USER_POPULATES.social.populate,
        droplets: {
          fields: ["id", "name", "slug", "description", "averageRating"],
        },
      },
    })) as AuthorizedUser;

    if (
      !userData.isPublic &&
      !isViewingOwnProfile &&
      !isAuthorizedUserAdmin(currentUser?.roles)
    ) {
      return <PrivateProfileError />;
    }

    // Fetch profile data
    const [
      enrollments,
      friends,
      announcements,
      { currentUserData, currentUserCompletedIds },
    ] = await Promise.all([
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
      viewerDataPromise,
    ]);

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
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-black dark:text-white">
            Profile Not Found
          </h1>
          <p className="text-[#667085] dark:text-slate-400">
            This profile is either private or does not exist.
          </p>
        </div>
      </div>
    );
  }
}

/**
 * Loads the signed-in viewer's social data and, when viewing someone else's
 * profile, the ids of droplets the viewer has completed. Errors are logged
 * and yield empty data so the profile still renders.
 */
async function getViewerData(
  currentUser: Awaited<ReturnType<typeof getCurrentUser>>,
  isViewingOwnProfile: boolean,
): Promise<{
  currentUserData: AuthorizedUser | null;
  currentUserCompletedIds: number[];
}> {
  const empty = { currentUserData: null, currentUserCompletedIds: [] };
  if (!currentUser?.email) return empty;

  try {
    const currentUserId = await getAuthorizedUserId(currentUser);
    const [maybeUserData, currentUserEnrollments] = await Promise.all([
      getCachedUserSocial(currentUser.email),
      !isViewingOwnProfile && currentUserId
        ? getEnrollmentsByAuthorizedUser(currentUserId, {
            populate: {
              droplet: {
                fields: ["id"],
              },
            },
          })
        : [],
    ]);
    if (!maybeUserData || typeof maybeUserData.id !== "number") {
      throw new Error("Current user data is missing a valid id");
    }

    return {
      currentUserData: maybeUserData,
      currentUserCompletedIds: (currentUserEnrollments || [])
        .filter((enrollment: Enrollment) => enrollment.isComplete)
        .map((enrollment: Enrollment) => enrollment.droplet.id),
    };
  } catch (error) {
    console.error("Error fetching current user data:", error);
    return empty;
  }
}
