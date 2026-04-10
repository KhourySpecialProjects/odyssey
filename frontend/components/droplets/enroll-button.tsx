"use client";

import { createEnrollment, deleteEnrollment } from "@/lib/requests/enrollment";
import { DropletEnrollmentSchema } from "@/lib/validations/enrollment";
import { Droplet, Enrollment } from "@/types";
import { IconArrowRight } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTransition, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import posthog from "posthog-js";

interface EnrollButtonProps {
  droplet: Droplet;
  isEnrolled?: boolean;
  userId?: number;
}

export function EnrollButton({
  droplet,
  isEnrolled,
  userId,
}: EnrollButtonProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Initialize PostHog once when component mounts
  useEffect(() => {
    if (typeof window !== "undefined" && !window.posthog) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
      });

      window.posthog = posthog;

      if (userId) {
        posthog.identify(userId.toString());
      }
    }
  }, [userId]);

  if (!droplet.lessons || droplet.lessons.length === 0) {
    return null;
  }

  async function enroll() {
    if (droplet.lessons && droplet.lessons.length > 0) {
      try {
        // Track enrollment button click directly
        posthog.capture("enroll_button_clicked", {
          droplet_id: droplet.id,
          droplet_name: droplet.name,
          droplet_slug: droplet.slug,
          user_id: userId,
          page: window.location.pathname,
          timestamp: new Date().toISOString(),
        });

        startTransition(async () => {
          if (
            !droplet.authorized_users?.some((user) =>
              user.enrollments?.some(
                (enrollment: Enrollment) =>
                  enrollment.droplet?.id === droplet.id,
              ),
            )
          ) {
            const enrollment = await createEnrollment(droplet, []);
            if (enrollment && enrollment.ok) {
              // Track successful enrollment
              posthog.capture("course_enrolled", {
                droplet_id: droplet.id,
                droplet_name: droplet.name,
                droplet_slug: droplet.slug,
                user_id: userId,
                page: window.location.pathname,
                timestamp: new Date().toISOString(),
              });

              toast.success(`You are now enrolled in ${droplet.name}!`);
              if (droplet.lessons) {
                router.push(`/d/${droplet.slug}/${droplet.lessons[0].slug}`);
              }
            } else {
              toast.error("Uh oh! Something went wrong.");
            }
          }
        });
      } catch {
        toast.error("Failed to enroll in the course");
      }
    }
  }

  function unenroll() {
    if (droplet.lessons && droplet.lessons.length > 0) {
      // Track unenroll button click
      posthog.capture("unenroll_button_clicked", {
        droplet_id: droplet.id,
        droplet_name: droplet.name,
        droplet_slug: droplet.slug,
        user_id: userId,
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
      });

      const values: z.infer<typeof DropletEnrollmentSchema> = {
        droplet: droplet.id,
        viewedLessons: [],
      };

      startTransition(() => {
        toast.promise(deleteEnrollment(values), {
          loading: "Unenrolling...",
          success: () => {
            // Track successful unenrollment
            posthog.capture("course_unenrolled", {
              droplet_id: droplet.id,
              droplet_name: droplet.name,
              droplet_slug: droplet.slug,
              user_id: userId,
              page: window.location.pathname,
              timestamp: new Date().toISOString(),
            });

            return `You are now unenrolled from ${droplet.name}!`;
          },
          error: (error) => (
            <div>
              <p>Uh oh! Something went wrong.</p>
              <pre>{error}</pre>
            </div>
          ),
        });
      });
    }
  }

  function handleContinue() {
    // Track continue button click
    posthog.capture("continue_course_clicked", {
      droplet_id: droplet.id,
      droplet_name: droplet.name,
      droplet_slug: droplet.slug,
      user_id: userId,
      page: window.location.pathname,
      destination: droplet.lessons
        ? `/d/${droplet.slug}/${droplet.lessons[0].slug}`
        : null,
      timestamp: new Date().toISOString(),
    });

    if (droplet.lessons) {
      router.push(`/d/${droplet.slug}/${droplet.lessons[0].slug}`);
    }
  }

  return (
    <div className="flex gap-2">
      {isEnrolled ? (
        <>
          <button
            onClick={handleContinue}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#2D7597] bg-[#2D7597] px-4 text-sm font-medium text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-[#255e78]"
          >
            Continue
            <IconArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={unenroll}
            className="flex h-10 items-center justify-center rounded-lg border border-[#D0D5DD] bg-white px-4 text-sm font-medium text-[#344054] transition-colors hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            Unenroll
          </button>
        </>
      ) : (
        <button
          onClick={enroll}
          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#2D7597] bg-[#2D7597] px-4 text-sm font-medium text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-[#255e78]"
        >
          Enroll and Continue
          <IconArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
