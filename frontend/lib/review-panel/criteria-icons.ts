import {
  IconArrowsSplit,
  IconMessageCircle,
  IconPalette,
  IconSparkles,
  IconStairs,
  IconTarget,
  type Icon,
} from "@tabler/icons-react";

const ICONS: Record<string, Icon> = {
  tone: IconMessageCircle,
  style: IconPalette,
  flow: IconArrowsSplit,
  scaffolding: IconStairs,
  quality: IconSparkles,
};

/** A criterion's icon by name (there is no icon field); unknown names get a fallback */
export function criterionIcon(name: string): Icon {
  return ICONS[name.trim().toLowerCase()] ?? IconTarget;
}
