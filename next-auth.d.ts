import "next-auth";

declare module "next-auth" {
  interface Session {
    employeeId: string;
    jobTitle: string;
  }
}
