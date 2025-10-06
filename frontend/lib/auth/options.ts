import { User } from "@/types";
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import GitHubProvider from "next-auth/providers/github";
import {
  fetchIsAuthorizedUser as fetchIsAuthorized,
  getAuthorizedUserByEmail,
} from "../requests/authorized-user";
import { getUserProfile } from "./azure";

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

      // const isAllowedToSignIn = await fetchIsAuthorized(user.email);

      // if (isAllowedToSignIn) {
      //   return true;
      // } else {
      //   return `/unauthorized`;
      // }
      return true;
    },
    async jwt({ token, user, account }) {
      // Add extra properties to the JWT token
      if (user) {
        // ALWAYS store the attempted email first
        if (user.email) {
          token.attemptedEmail = user.email;
        }

        // Check if they're authorized before fetching additional data
        const isAuthorized = await fetchIsAuthorized(user.email as string);
        token.isAuthorized = isAuthorized;

        if (isAuthorized) {
          // Only fetch additional data for authorized users
          const graphProfile = await getUserProfile(
            account?.access_token as string,
          );

          const authorizedUser = await getAuthorizedUserByEmail(
            user.email as string,
            { populate: { roles: { fields: ["title"] } } },
          );

          // Enrich token with user details
          token.user = {
            name: user.name,
            email: user.email,
            image: user.image,
            nuid: graphProfile.nuid,
            isActive: true,
            roles: authorizedUser.roles.map((elem) => elem.title),
          };
        }
        // If not authorized, we just have attemptedEmail in the token
      }
      return token;
    },
    session: async ({ session, token }) => {
      // Only set user if they're authorized
      if (token.user) {
        session.user = token.user as User;
      }

      // Pass attempted email for unauthorized users
      if (token.attemptedEmail) {
        session.attemptedEmail = token.attemptedEmail as string;
      }

      session.isAuthorized = token.isAuthorized;

      return session;
    },
  },
};
