import { User } from "@/types";
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import GitHubProvider from "next-auth/providers/github";
import { fetchIsAuthorizedUser as fetchIsAuthorized } from "../requests/authorized-user";
import { fetchAPI, STRAPI_RESPONSE_FORMAT_HEADER } from "../utils";
import { getUserProfile, getUserPhoto } from "./azure";
import { uploadImage, deleteImage } from "../actions";
import { AuthorizedUserRoleTitle } from "../globals";
import {
  strapiEntryUrl,
  StrapiEntryNotFoundError,
  type EntryRef,
} from "../strapi-document-id";

const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

async function syncAzureProfilePhoto(
  accessToken: string,
  user: EntryRef,
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
    const res = await fetch(await strapiEntryUrl("authorized-users", user), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify({ data: { profilePhoto } }),
    });
    if (!res.ok) {
      console.error("Strapi profile photo save failed:", res.status);
      await deleteImage(fileName).catch(() => {});
      return null;
    }
  } catch (err) {
    if (err instanceof StrapiEntryNotFoundError) {
      // Same outcome as the 404 the PUT used to return.
      console.error("Strapi profile photo save failed:", 404);
      await deleteImage(fileName).catch(() => {});
      return null;
    }
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
              documentId?: string;
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
            ? await syncAzureProfilePhoto(account.access_token, authorizedUser)
            : null);

        token.user = {
          // Stored so pages can start id-keyed fetches without first looking
          // the user up by email (see lib/auth/current-user-id.ts).
          id: authorizedUser.id,
          documentId: authorizedUser.documentId,
          name: user.name,
          email: user.email,
          image: profilePhoto || user.image,
          nuid: graphProfile?.nuid,
          isActive: true,
          roles: authorizedUser.roles.map(
            (elem) => elem.title as AuthorizedUserRoleTitle,
          ),
        };
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
