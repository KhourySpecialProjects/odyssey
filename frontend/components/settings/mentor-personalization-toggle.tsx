"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { updateUserInfo } from "@/lib/requests/authorized-user";

export function MentorPersonalizationToggle({
  userId,
  initialValue,
}: {
  userId: number;
  initialValue: boolean;
}) {
  const id = useId();
  const [on, setOn] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function change(next: boolean) {
    const previous = on;
    setOn(next);
    setSaving(true);
    try {
      const result = await updateUserInfo(userId, {
        mentorPersonalization: next,
      });
      if (!result.ok) throw new Error("save failed");
    } catch {
      setOn(previous);
      toast.error("Couldn't save your Mentor setting. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-4">
        <label htmlFor={id} className="block text-base">
          Personalize Mentor
        </label>
        <Switch
          id={id}
          checked={on}
          disabled={saving}
          onCheckedChange={change}
          aria-describedby={`${id}-help`}
        />
      </div>
      <p
        id={`${id}-help`}
        className="text-sm text-gray-600 dark:text-slate-300"
      >
        Mentor uses the droplets you&apos;ve finished and are working on,
        whether you&apos;ve finished this droplet&apos;s prerequisites, and
        which lessons you&apos;ve viewed, and the lesson quizzes you&apos;ve
        recently missed to tailor its answers. Turn this off and Mentor answers
        everyone the same way. Saved automatically.
      </p>
    </div>
  );
}
