import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { getUserProfile } from "./azureGraph";
import { fetchAuthorizedUsers as fetchIsAuthorized } from "./data";

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

        // Add the employeeId and jobTitle to the token
        token.employeeId = graphProfile.employeeId || "";
        token.jobTitle = graphProfile.jobTitle || "";
      }

      return token;
    },
    session: async ({ session, token }) => {
      // Add properties to session
      session.employeeId = token.employeeId as string;
      session.jobTitle = token.jobTitle as string;

      return session;
    },
  },
};
