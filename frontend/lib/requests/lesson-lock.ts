"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_API_URL = `${STRAPI_BASE_URL}/api`;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

function strapiHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
  };
}

export type LockStatus = {
  isLocked: boolean;
  lockedBy: { id: number; firstName: string; lastName: string } | null;
  lockedAt: string | null;
};

/** Resolve the current user's authorized-user ID. Called once on mount. */
export async function getCurrentAuthorizedUserId(): Promise<number | null> {
  const user = await getCurrentUser();
  if (!user?.email) {
    console.warn(
      "[lesson-lock] No session user or email — cannot acquire lock",
    );
    return null;
  }
  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  if (!authorizedUser?.id) {
    console.warn(
      `[lesson-lock] No authorized user found for email: ${user.email}`,
    );
    return null;
  }
  return authorizedUser.id;
}

export async function acquireLessonLock(
  lessonId: number,
  userId: number,
): Promise<{
  success: boolean;
  error?: string;
  lockedBy?: LockStatus["lockedBy"];
}> {
  const res = await fetch(`${STRAPI_API_URL}/lessons/${lessonId}/lock`, {
    method: "POST",
    headers: strapiHeaders(),
    body: JSON.stringify({ userId }),
  });

  if (res.ok) return { success: true };

  if (res.status === 409) {
    const data = await res.json();
    return {
      success: false,
      error: "Lesson is locked",
      lockedBy: data.lockedBy ?? data.error?.details?.lockedBy,
    };
  }

  console.error(
    `[lesson-lock] Failed to acquire lock: ${res.status} ${res.statusText}`,
  );
  return { success: false, error: "Failed to acquire lock" };
}

export async function releaseLessonLock(
  lessonId: number,
  userId: number,
): Promise<void> {
  await fetch(`${STRAPI_API_URL}/lessons/${lessonId}/lock?userId=${userId}`, {
    method: "DELETE",
    headers: strapiHeaders(),
  });
}

export async function heartbeatLessonLock(
  lessonId: number,
  userId: number,
): Promise<boolean> {
  const res = await fetch(
    `${STRAPI_API_URL}/lessons/${lessonId}/lock/heartbeat`,
    {
      method: "PUT",
      headers: strapiHeaders(),
      body: JSON.stringify({ userId }),
    },
  );

  if (!res.ok) {
    console.error(
      `[lesson-lock] Heartbeat failed: ${res.status} ${res.statusText}`,
    );
  }
  return res.ok;
}

export async function getLessonLockStatus(
  lessonId: number,
): Promise<LockStatus> {
  try {
    const res = await fetch(
      `${STRAPI_API_URL}/lessons/${lessonId}/lock-status`,
      { method: "GET", headers: strapiHeaders() },
    );

    if (!res.ok) {
      return { isLocked: false, lockedBy: null, lockedAt: null };
    }

    return res.json();
  } catch {
    return { isLocked: false, lockedBy: null, lockedAt: null };
  }
}
