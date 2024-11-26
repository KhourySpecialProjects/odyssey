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

export function EnrollButton({ droplet }: { droplet: Droplet }) {
  const router = useRouter();

  const [_, startTransition] = useTransition();

  if (!droplet.lessons || droplet.lessons.length === 0) {
    return null;
  }

  function enroll() {
    if (droplet.lessons && droplet.lessons.length > 0) {
      const values: z.infer<typeof DropletEnrollmentSchema> = {
        droplet: droplet.id,
        viewedLessons: [],
      };

      startTransition(() => {
        toast.promise(createEnrollment(values), {
          loading: "Enrolling...",
          success: () => `You are now enrolled in ${droplet.name}!`,
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

  return (
    <Button
      size="lg"
      after={<ArrowRightIcon />}
      onClick={() => {
        if (droplet.lessons && droplet.lessons[0]) {
          enroll();
          router.push(`/d/${droplet.slug}/${droplet.lessons[0].slug}`);
        }
      }}
    >
      Enroll and Continue
    </Button>
  );
}
