import "next-auth";
import { User } from ".";

declare module "next-auth" {
  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    user?: User;
    /** ms timestamp of the last account-id check. Top-level on purpose: `user` is exposed to the browser. */
    userIdCheckedAt?: number;
  }
}
