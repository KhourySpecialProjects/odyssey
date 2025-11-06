import { NextRequest, NextResponse } from "next/server";
import { getUserActivity } from "@/lib/requests/user-activity";
// Import your auth config
import { authOptions } from "@/lib/auth/options";
import { getServerSession } from "next-auth";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    // Optional: Check if user is authenticated and authorized
    // Uncomment these lines if you want to restrict access

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = session.user.roles?.some(
      (role) =>
        role === AuthorizedUserRoleTitle.SysAdmin ||
        role === AuthorizedUserRoleTitle.AcadAdmin ||
        role === AuthorizedUserRoleTitle.WebsiteEditor,
    );
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Await params in Next.js 15
    const { userId: userIdString } = await params;
    const userId = parseInt(userIdString);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Fetch user activity (this runs server-side, so POSTHOG_API_KEY is available)
    const activities = await getUserActivity(userId);

    return NextResponse.json(activities, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error in user-activity API route:", error);
    return NextResponse.json(
      { error: "Failed to fetch user activity" },
      { status: 500 },
    );
  }
}

// Alternative: Using Server Actions (if you prefer)
// Create this file instead: app/actions/user-activity.ts
/*
'use server';

import { getUserActivity } from '@/lib/requests/user-activity';

export async function getUserActivityAction(userId: number) {
  try {
    const activities = await getUserActivity(userId);
    return { success: true, data: activities };
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return { success: false, error: 'Failed to fetch activity' };
  }
}
*/
