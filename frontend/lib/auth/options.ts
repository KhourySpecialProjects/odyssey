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
        // Fetch additional user data from Microsoft Graph
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

      return token;
    },
    session: async ({ session, token }) => {
      if (!token.user) throw new Error("No user data");

      session.user = token.user as User;

      return session;
    },
  },
};
