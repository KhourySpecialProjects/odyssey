import "next-auth";
import { User } from ".";

declare module "next-auth" {
  interface Session {
    user: User;
    attemptedEmail?: string;
    isAuthorized?: boolean;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    user?: User;
    attemptedEmail?: string;
    isAuthorized?: boolean;
  }
}
