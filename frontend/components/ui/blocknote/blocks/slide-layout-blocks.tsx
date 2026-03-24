import { createReactBlockSpec } from "@blocknote/react";
import {
  PanelLeftIcon,
  PanelRightIcon,
  ImageIcon,
  ColumnsIcon,
} from "lucide-react";

/**
 * Slide layout blocks for BlockNote.
 * These are visual markers in the editor that control how the NEXT content
 * (until the next slide break or layout block) is displayed in presentation mode.
 *
 * - image-left: Image on left, text on right
 * - image-right: Text on left, image on right
 * - full-image: Image centered, takes full slide
 * - two-columns: Content split into two equal columns
 */

const layoutBadge = (
  icon: React.ReactNode,
  label: string,
  color: string,
  bgColor: string,
  borderColor: string,
) => (
  <div className="my-3 flex items-center gap-3 py-1 select-none">
    <div
      className="h-px flex-1 border-t-2 border-dashed"
      style={{ borderColor }}
    />
    <div
      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
      style={{ color, backgroundColor: bgColor }}
    >
      {icon}
      {label}
    </div>
    <div
      className="h-px flex-1 border-t-2 border-dashed"
      style={{ borderColor }}
    />
  </div>
);

export const ImageLeftLayout = createReactBlockSpec(
  {
    type: "slide-image-left" as const,
    propSchema: {},
    content: "none",
  },
  {
    render: () =>
      layoutBadge(
        <PanelLeftIcon className="h-3.5 w-3.5" />,
        "Image Left",
        "#7c3aed",
        "#f5f3ff",
        "#c4b5fd",
      ),
  },
);

export const ImageRightLayout = createReactBlockSpec(
  {
    type: "slide-image-right" as const,
    propSchema: {},
    content: "none",
  },
  {
    render: () =>
      layoutBadge(
        <PanelRightIcon className="h-3.5 w-3.5" />,
        "Image Right",
        "#7c3aed",
        "#f5f3ff",
        "#c4b5fd",
      ),
  },
);

export const FullImageLayout = createReactBlockSpec(
  {
    type: "slide-full-image" as const,
    propSchema: {},
    content: "none",
  },
  {
    render: () =>
      layoutBadge(
        <ImageIcon className="h-3.5 w-3.5" />,
        "Full Image",
        "#059669",
        "#ecfdf5",
        "#6ee7b7",
      ),
  },
);

export const TwoColumnsLayout = createReactBlockSpec(
  {
    type: "slide-two-columns" as const,
    propSchema: {},
    content: "none",
  },
  {
    render: () =>
      layoutBadge(
        <ColumnsIcon className="h-3.5 w-3.5" />,
        "Two Columns",
        "#d97706",
        "#fffbeb",
        "#fcd34d",
      ),
  },
);
