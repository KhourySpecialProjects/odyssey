import { BAND_COLORS } from "@/lib/review-panel/colors";
import { criterionIcon } from "@/lib/review-panel/criteria-icons";
import { bandOf } from "@/lib/review-panel/model";
import { BADGE } from "./criterion-circle";

/** A display-only score circle for a collapsed card's header. */
export function MiniCriterionCircle({
  name,
  value,
  suggested = false,
}: {
  name: string;
  value: number | null;
  suggested?: boolean;
}) {
  const band = bandOf(value);
  const colors = BAND_COLORS[band];
  const Icon = criterionIcon(name);

  return (
    <span
      aria-hidden
      data-mini-circle
      data-band={band}
      data-suggested={suggested}
      className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bg-white"
      style={{
        borderStyle: band === "unscored" ? "dashed" : "solid",
        borderColor: colors.outline,
        color: band === "unscored" ? colors.outline : "#344054",
      }}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {band !== "unscored" && (
        <span
          data-mini-badge
          className="absolute -right-1 -bottom-1 flex h-2.5 w-2.5 items-center justify-center rounded-full border border-white text-[7px] leading-none font-bold text-white"
          style={{ backgroundColor: colors.text }}
        >
          {BADGE[band]}
        </span>
      )}
    </span>
  );
}
