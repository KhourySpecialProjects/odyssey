import { getDemoAccounts } from "@/lib/auth/demo-login";
import { DemoPersonaPicker } from "./demo-persona-picker";

/** Loads the seeded demo accounts for the persona picker (demo mode only). */
export async function DemoLogin() {
  const { personas, others } = await getDemoAccounts();
  return <DemoPersonaPicker personas={personas} others={others} />;
}
