import CredentialsProvider from "next-auth/providers/credentials";
import { fetchAPI } from "../utils";

/**
 * The demo environment's persona login (see demo/README.md). It exists only
 * when DEMO_MODE=true and only admits the reserved demo domain, which no real
 * account uses, so even a demo flag switched on by mistake can't log anyone in
 * as a real person.
 */
export const DEMO_EMAIL_DOMAIN = "demo.odyssey.test";

export const isDemoMode = () => process.env.DEMO_MODE === "true";

export function isDemoEmail(email: unknown): email is string {
  return (
    typeof email === "string" &&
    /^[a-z0-9._-]+@demo\.odyssey\.test$/.test(email)
  );
}

type DemoAccountRow = {
  id?: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  isEnabled?: boolean;
  roles?: { title: string }[];
};

const fullName = (row: DemoAccountRow) =>
  `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || row.email;

/** next-auth `authorize` for the demo provider: an enabled demo account, or null. */
export async function authorizeDemoLogin(
  credentials: Record<string, string> | undefined,
) {
  const email = credentials?.email?.trim().toLowerCase();
  if (!isDemoMode() || !isDemoEmail(email)) return null;

  const [account] = await fetchAPI<DemoAccountRow[]>("/authorized-users", {
    urlParams: {
      filters: { email: { $eq: email } },
      fields: ["id", "email", "firstName", "lastName", "isEnabled"],
      pagination: { pageSize: 1, page: 1 },
    },
    cache: "no-store",
  });
  if (!account?.isEnabled) return null;

  return { id: String(account.id), email, name: fullName(account) };
}

export function demoLoginProvider() {
  return CredentialsProvider({
    id: "demo",
    name: "Demo persona",
    credentials: { email: { label: "Email", type: "email" } },
    authorize: authorizeDemoLogin,
  });
}

export type DemoAccount = {
  email: string;
  name: string;
  role: string;
  bio: string | null;
};

// Display order on the persona picker
const ROLE_ORDER = [
  "System Admin",
  "Content Creator",
  "Content Editor",
  "Faculty",
  "Student",
];

const trailingNumber = (email: string) =>
  Number(email.split("@")[0].match(/(\d+)$/)?.[1] ?? 0);

/**
 * Demo accounts for the login page. Personas are the seeded accounts with a
 * bio (one per role, plus three students); the rest are background students.
 */
export async function getDemoAccounts(): Promise<{
  personas: DemoAccount[];
  others: DemoAccount[];
}> {
  const rows = await fetchAPI<DemoAccountRow[]>("/authorized-users", {
    urlParams: {
      filters: {
        email: { $endsWith: `@${DEMO_EMAIL_DOMAIN}` },
        isEnabled: { $eq: true },
      },
      fields: ["email", "firstName", "lastName", "bio"],
      populate: { roles: { fields: ["title"] } },
      sort: ["email:asc"],
      pagination: { pageSize: 100, page: 1 },
    },
    cache: "no-store",
  });

  const accounts = rows.map((row) => ({
    email: row.email,
    name: fullName(row),
    role:
      (row.roles ?? []).map((role) => role.title).find((t) => t !== "User") ??
      "Student",
    bio: row.bio ?? null,
  }));
  const byRoleThenNumber = (a: DemoAccount, b: DemoAccount) =>
    ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
    trailingNumber(a.email) - trailingNumber(b.email);

  return {
    personas: accounts.filter((a) => a.bio).sort(byRoleThenNumber),
    others: accounts.filter((a) => !a.bio).sort(byRoleThenNumber),
  };
}
