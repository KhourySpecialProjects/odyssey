import { createReactBlockSpec } from "@blocknote/react";
import { Menu } from "@mantine/core";
import type { CalloutType } from "@/lib/blocknote/types";
import {
  CALLOUT_CONTAINER_CLASS,
  CALLOUT_ICON_CLASS,
  CALLOUT_STYLES,
  CALLOUT_TEXT_CLASS,
  CALLOUT_TYPES,
} from "@/lib/blocknote/callout-styles";
import { cn } from "@/lib/utils";

export const Callout = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      calloutType: {
        default: "warning" as CalloutType,
        values: CALLOUT_TYPES as readonly CalloutType[],
      },
    },
    content: "inline",
  },
  {
    render: (props) => {
      const calloutType = props.block.props.calloutType as CalloutType;
      const config = CALLOUT_STYLES[calloutType];
      const Icon = config.icon;

      return (
        <div
          className={CALLOUT_CONTAINER_CLASS}
          style={{ backgroundColor: config.bg }}
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
                    className={CALLOUT_ICON_CLASS}
                  />
                ) : (
                  <div style={{ width: 24, height: 24 }} />
                )}
              </div>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Callout Type</Menu.Label>
              <Menu.Divider />
              {CALLOUT_TYPES.map((type) => {
                const { icon: ItemIcon, title } = CALLOUT_STYLES[type];
                return (
                  <Menu.Item
                    key={type}
                    leftSection={<ItemIcon size={18} />}
                    onClick={() =>
                      props.editor.updateBlock(props.block, {
                        type: "callout",
                        props: { calloutType: type },
                      })
                    }
                  >
                    {title}
                  </Menu.Item>
                );
              })}
            </Menu.Dropdown>
          </Menu>
          {/* Editable content with placeholder */}
          <div
            className={cn("inline-content", CALLOUT_TEXT_CLASS)}
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
