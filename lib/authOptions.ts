import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { getUserProfile } from "./azureGraph";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Add extra properties to the JWT token
      if (user) {
        // Fetch additional user data from Microsoft Graph
        const graphProfile = await getUserProfile(
          account?.access_token as string
        );

        // Add the employeeId to the token
        token.employeeId = graphProfile.employeeId || "";
      }

      return token;
    },
    session: async ({ session, token }) => {
      // Add properties to session, if needed
      session.employeeId = token.employeeId as string;

      return session;
    },
  },
};
