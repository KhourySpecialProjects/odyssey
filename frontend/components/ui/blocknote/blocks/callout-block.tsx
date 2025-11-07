import { createReactBlockSpec } from "@blocknote/react";
import { Menu } from "@mantine/core";
import type { CalloutType } from "@/lib/blocknote/types";
import {
  TriangleAlert,
  CircleHelp,
  CircleAlert,
  BookOpenText,
  BadgeInfo,
  Bell,
} from "lucide-react";

const calloutConfigs = {
  warning: { bg: "#FFCCCB", icon: TriangleAlert, title: "Warning" },
  question: { bg: "#BBE5FF", icon: CircleHelp, title: "Question" },
  important: { bg: "#FFD4A3", icon: CircleAlert, title: "Important" },
  definition: { bg: "#C8E6C9", icon: BookOpenText, title: "Definition" },
  "more-information": {
    bg: "#E1BEE7",
    icon: BadgeInfo,
    title: "More Information",
  },
  caution: { bg: "#FFF59D", icon: Bell, title: "Caution" },
  default: { bg: "#EEEEEE", icon: null, title: "Default" },
};

export const Callout = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      calloutType: {
        default: "warning" as CalloutType,
        values: [
          "warning",
          "question",
          "important",
          "definition",
          "more-information",
          "caution",
          "default",
        ] as const,
      },
    },
    content: "inline",
  },
  {
    render: (props) => {
      const calloutType = props.block.props.calloutType as CalloutType;
      const config = calloutConfigs[calloutType];
      const Icon = config.icon;

      return (
        <div
          style={{
            backgroundColor: config.bg,
            padding: "16px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            minWidth: "200px",
            width: "100%",
          }}
        >
          {/* Clickable icon with dropdown menu */}
          <Menu withinPortal={false}>
            <Menu.Target>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  padding: "4px",
                  flexShrink: 0,
                }}
                contentEditable={false}
              >
                {Icon ? (
                  <Icon
                    size={24}
                    strokeWidth={2}
                    className="text-slate-800 dark:text-slate-900"
                  />
                ) : (
                  <div style={{ width: 24, height: 24 }} />
                )}
              </div>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Callout Type</Menu.Label>
              <Menu.Divider />
              <Menu.Item
                leftSection={<TriangleAlert size={18} />}
                onClick={() =>
                  props.editor.updateBlock(props.block, {
                    type: "callout",
                    props: { calloutType: "warning" },
                  })
                }
              >
                Warning
              </Menu.Item>
              <Menu.Item
                leftSection={<CircleHelp size={18} />}
                onClick={() =>
                  props.editor.updateBlock(props.block, {
                    type: "callout",
                    props: { calloutType: "question" },
                  })
                }
              >
                Question
              </Menu.Item>
              <Menu.Item
                leftSection={<CircleAlert size={18} />}
                onClick={() =>
                  props.editor.updateBlock(props.block, {
                    type: "callout",
                    props: { calloutType: "important" },
                  })
                }
              >
                Important
              </Menu.Item>
              <Menu.Item
                leftSection={<BookOpenText size={18} />}
                onClick={() =>
                  props.editor.updateBlock(props.block, {
                    type: "callout",
                    props: { calloutType: "definition" },
                  })
                }
              >
                Definition
              </Menu.Item>
              <Menu.Item
                leftSection={<BadgeInfo size={18} />}
                onClick={() =>
                  props.editor.updateBlock(props.block, {
                    type: "callout",
                    props: { calloutType: "more-information" },
                  })
                }
              >
                More Information
              </Menu.Item>
              <Menu.Item
                leftSection={<Bell size={18} />}
                onClick={() =>
                  props.editor.updateBlock(props.block, {
                    type: "callout",
                    props: { calloutType: "caution" },
                  })
                }
              >
                Caution
              </Menu.Item>
              <Menu.Item
                leftSection={<div style={{ width: 18, height: 18 }} />}
                onClick={() =>
                  props.editor.updateBlock(props.block, {
                    type: "callout",
                    props: { calloutType: "default" },
                  })
                }
              >
                Default
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          {/* Editable content with placeholder */}
          <div
            className="inline-content"
            ref={props.contentRef}
            style={{
              flex: 1,
              minHeight: "24px",
              position: "relative",
              cursor: "text",
              minWidth: "200px",
            }}
          >
            {/* Show placeholder only when empty */}
            {!props.block.content?.length && (
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  color: "#6B7280",
                  pointerEvents: "none",
                  userSelect: "none",
                  fontStyle: "italic",
                }}
                contentEditable={false}
              >
                Type something...
              </span>
            )}
          </div>
        </div>
      );
    },
  },
);
