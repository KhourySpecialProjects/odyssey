"use client";

import { Input } from "@/components/ui/input";
import { TIME_ZONES } from "@/lib/time-zones";
import type { OnboardingDraft } from "@/lib/validations/onboarding";

export type ProfileFields = Pick<
  OnboardingDraft,
  "first" | "last" | "bio" | "timeZone"
>;

const labelClass = "mb-1 block text-xs font-medium text-slate-700";
const req = <span className="text-red-500"> *</span>;

export function ProfileStep({
  value,
  onChange,
}: {
  value: ProfileFields;
  onChange: (patch: ProfileFields) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className={labelClass}>First name{req}</span>
        <Input
          value={value.first ?? ""}
          onChange={(e) => onChange({ first: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={labelClass}>Last name{req}</span>
        <Input
          value={value.last ?? ""}
          onChange={(e) => onChange({ last: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={labelClass}>Time zone{req}</span>
        <select
          value={value.timeZone ?? ""}
          onChange={(e) =>
            onChange({ timeZone: e.target.value as ProfileFields["timeZone"] })
          }
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <option value="" disabled>
            Choose a time zone...
          </option>
          {TIME_ZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={labelClass}>Short bio (optional)</span>
        <Input
          value={value.bio ?? ""}
          placeholder="e.g. 2nd-year CS, into web dev"
          onChange={(e) => onChange({ bio: e.target.value })}
        />
      </label>
    </div>
  );
}
