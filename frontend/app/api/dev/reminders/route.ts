import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { runReminderCheck } from "@/lib/reminders";
import { isReminderTestClockEnabled } from "@/lib/reminder-test-clock";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import type { AuthorizedUser } from "@/types";

// ODY-931: local-only test hook. GET previews the caller's reminder decision as
// of `at`; POST raises it.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request, dryRun: boolean) {
  if (!isReminderTestClockEnabled()) {
    return new Response("Not found", { status: 404 });
  }
  const gate = await requireRole([]);
  if (!gate.ok) return Response.json({ error: gate.error }, { status: 401 });

  // searchParams decodes an unencoded `+` offset to a space
  const at =
    new URL(request.url).searchParams.get("at")?.replaceAll(" ", "+") ?? null;
  if (
    at !== null &&
    !z.string().datetime({ offset: true }).safeParse(at).success
  ) {
    return Response.json(
      { error: "`at` must be an ISO datetime with Z or an offset" },
      { status: 400 },
    );
  }
  const now = at ? new Date(at) : new Date();

  // A failed lookup falls back to Boston
  const record = await getAuthorizedUserByEmail<
    Pick<AuthorizedUser, "id" | "timeZone">
  >(gate.user.email, { fields: ["id", "timeZone"] }).catch(() => null);
  const result = await runReminderCheck(
    { id: gate.user.id, timeZone: record?.timeZone },
    { now, dryRun },
  );
  return Response.json({ at: now.toISOString(), ...result });
}

export const GET = (request: Request) => handle(request, true);
export const POST = (request: Request) => handle(request, false);
