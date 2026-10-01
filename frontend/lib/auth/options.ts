import { User } from "@/types";
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import GitHubProvider from "next-auth/providers/github";
import { fetchIsAuthorizedUser as fetchIsAuthorized } from "../requests/authorized-user";
import { fetchAPI } from "../utils";
import { getUserProfile, getUserPhoto } from "./azure";
import { uploadImage, deleteImage } from "../actions";
import { AuthorizedUserRoleTitle } from "../globals";
import { CACHE_TAGS } from "../cache-tags";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/**
 * How often the jwt callback re-checks the account id kept in the token.
 *
 * ODY-555 keeps the Strapi authorized-user id in the token so pages can start
 * id-keyed fetches in parallel. An account that is deleted and re-created gets
 * a new id, so without a re-check a session would carry a stale or dead id for
 * up to NextAuth's 30-day rolling expiry. This bounds that window.
 *
 * Note: in App Router Server Components getServerSession can't write the
 * cookie, so a refreshed token is only persisted when the client's
 * SessionProvider calls /api/auth/session (on load and window focus). Until
 * then each RSC request re-runs the lookup, which is normally a data-cache hit.
 */
const ACCOUNT_ID_RECHECK_MS = 5 * 60 * 1000;

/** Looks up just the authorized-user id by email; null if no user matches. */
async function fetchAccountId(email: string): Promise<number | null> {
  const [match] = await fetchAPI<{ id: number }[]>("/authorized-users", {
    urlParams: {
      filters: { email: { $eq: email } },
      fields: ["id"],
      pagination: { pageSize: 1, page: 1 },
    },
    // Data-cached so the re-check is normally a cache hit; create/delete
    // AuthorizedUser revalidate `users`, so an in-app delete/re-create is
    // seen on the next check.
    next: { revalidate: 900, tags: [CACHE_TAGS.users] },
  });
  return match?.id ?? null;
}

async function syncAzureProfilePhoto(
  accessToken: string,
  userId: number,
): Promise<string | null> {
  const photoBuffer = await getUserPhoto(accessToken);
  if (!photoBuffer) return null;

  const file = new File([new Uint8Array(photoBuffer)], "profile-photo.jpg", {
    type: "image/jpeg",
  });
  const formData = new FormData();
  formData.set("image", file);
  const uploadResult = await uploadImage(formData);
  if (!uploadResult.ok || !uploadResult.url) return null;

  const profilePhoto = uploadResult.url;
  const fileName = profilePhoto.split("/").pop()!;
  try {
    const res = await fetch(
      `${STRAPI_API_URL}/api/authorized-users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ data: { profilePhoto } }),
      },
    );
    if (!res.ok) {
      console.error("Strapi profile photo save failed:", res.status);
      await deleteImage(fileName).catch(() => {});
      return null;
    }
  } catch (err) {
    console.error("Failed to save profile photo to Strapi:", err);
    await deleteImage(fileName).catch(() => {});
    return null;
  }

  return profilePhoto;
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: "openid email profile User.Read",
        },
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const isAllowedToSignIn = await fetchIsAuthorized(user.email);

      if (isAllowedToSignIn) {
        return true;
      } else {
        return `/unauthorized`;
      }
    },
    async jwt({ token, user, account, profile }) {
      // Add extra properties to the JWT token
      if (user) {
        const isAzure = account?.provider === "azure-ad";

        const [graphProfile, [authorizedUser]] = await Promise.all([
          isAzure
            ? getUserProfile(account.access_token as string)
            : Promise.resolve(null),
          fetchAPI<
            {
              id: number;
              roles: { title: string }[];
              profilePhoto: string | null;
            }[]
          >("/authorized-users", {
            urlParams: {
              filters: { email: { $eq: user.email } },
              fields: ["id", "profilePhoto"],
              populate: { roles: { fields: ["title"] } },
              pagination: { pageSize: 1, page: 1 },
            },
            cache: "no-store",
          }),
        ]);

        const profilePhoto =
          authorizedUser.profilePhoto ||
          (isAzure && account.access_token
            ? await syncAzureProfilePhoto(
                account.access_token,
                authorizedUser.id,
              )
            : null);

        token.user = {
          // Stored so pages can start id-keyed fetches without first looking
          // the user up by email (see lib/auth/current-user-id.ts).
          id: authorizedUser.id,
          name: user.name,
          email: user.email,
          image: profilePhoto || user.image,
          nuid: graphProfile?.nuid,
          isActive: true,
          roles: authorizedUser.roles.map(
            (elem) => elem.title as AuthorizedUserRoleTitle,
          ),
        };
        token.userIdCheckedAt = Date.now();
      } else if (
        token.user?.email &&
        (!token.userIdCheckedAt ||
          Date.now() - token.userIdCheckedAt > ACCOUNT_ID_RECHECK_MS)
      ) {
        try {
          const id = await fetchAccountId(token.user.email);
          // No match: drop the id so getAuthorizedUserId falls back to the
          // email lookup and pages take their not-found/unauthorized paths.
          token.user = { ...token.user, id: id ?? undefined };
          token.userIdCheckedAt = Date.now();
        } catch (err) {
          console.error("Failed to re-check authorized user id:", err);
        }
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (!token.user) throw new Error("No user data");

      session.user = token.user as User;

      return session;
    },
  },
};
