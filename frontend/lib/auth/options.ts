import { User } from "@/types";
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import {
  fetchIsAdmin,
  fetchIsAuthorizedUser as fetchIsAuthorized,
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
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const isAllowedToSignIn = await fetchIsAuthorized(user.email);

      if (isAllowedToSignIn) {
        return true;
      } else {
        // Return false to display a default error message
        // return false;
        // Or you can return a URL to redirect to:
        return "/unauthorized";
      }
    },
    async jwt({ token, user, account, profile }) {
      // Add extra properties to the JWT token
      if (user) {
        // Fetch additional user data from Microsoft Graph
        const graphProfile = await getUserProfile(
          account?.access_token as string
        );

        // Fetch additional user data from Microsoft Graph
        const isAdmin = await fetchIsAdmin(user.email as string);

        // Enrich token with user details
        token.user = {
          name: user.name,
          email: user.email,
          image: user.image,
          employeeId: graphProfile.employeeId,
          jobTitle: graphProfile.jobTitle,
          isAdmin: isAdmin,
        };
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (!token.user) throw new Error("No user data");

      // Add properties to session
      session.user = token.user as User;

      return session;
    },
  },
};
