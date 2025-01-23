"use client";

import { Button } from "@/components/ui/button";
import { createEnrollment } from "@/lib/actions";
import { DropletEnrollmentSchema } from "@/lib/validations/enrollment";
import { Droplet } from "@/types";
import { ArrowRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";

interface EnrollButtonProps {
  droplet: Droplet;
  isEnrolled?: boolean;
}

export function EnrollButton({ droplet, isEnrolled }: EnrollButtonProps) {
  const router = useRouter();
  const [_, startTransition] = useTransition();

  if (!droplet.lessons || droplet.lessons.length === 0) {
    return null;
  }

  async function enroll() {
    if (droplet.lessons && droplet.lessons.length > 0) {
      const values: z.infer<typeof DropletEnrollmentSchema> = {
        droplet: droplet.id,
        viewedLessons: [],
      };

      startTransition(async () => {
        try {
          await toast.promise(createEnrollment(values), {
            loading: "Enrolling...",
            success: () => `You are now enrolled in ${droplet.name}!`,
            error: "Failed to enroll",
          });

          router.refresh();
        } catch (error) {
          console.error("Enrollment error:", error);
        }
      });
    }
  }

  return (
    <Button
      size="lg"
      after={<ArrowRightIcon />}
      onClick={() => {
        if (droplet.lessons && droplet.lessons[0]) {
          enroll();
          //router.push(`/d/${droplet.slug}/${droplet.lessons[0].slug}`);
        }
      }}
      disabled={isEnrolled}
      variant={isEnrolled ? "secondary" : "default"}
    >
      {isEnrolled ? "Already Enrolled" : "Enroll and Continue"}
    </Button>
  );
}
