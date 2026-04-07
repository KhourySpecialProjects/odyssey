"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  BlockSchema,
  InlineContentSchema,
  mapTableCell,
  StyleSchema,
  TableContent,
} from "@blocknote/core";
import { CellSelection, TableMap } from "prosemirror-tables";
import { useCallback, useMemo } from "react";
import { RiPaintFill } from "react-icons/ri";

import {
  useBlockNoteEditor,
  useComponentsContext,
  useSelectedBlocks,
} from "@blocknote/react";

const BG_COLORS = [
  { name: "Default", value: "default", hex: "transparent" },
  { name: "Gray", value: "gray", hex: "#e2e8f0" },
  { name: "Brown", value: "brown", hex: "#d6bcab" },
  { name: "Red", value: "red", hex: "#fecaca" },
  { name: "Orange", value: "orange", hex: "#fed7aa" },
  { name: "Yellow", value: "yellow", hex: "#fef08a" },
  { name: "Green", value: "green", hex: "#bbf7d0" },
  { name: "Blue", value: "blue", hex: "#bfdbfe" },
  { name: "Purple", value: "purple", hex: "#ddd6fe" },
  { name: "Pink", value: "pink", hex: "#fbcfe8" },
] as const;

/**
 * Toolbar button that shows a background color picker for selected table cells.
 * Only renders when a table block with an active cell selection is present.
 */
export const TableCellColorButton = () => {
  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();
  const selectedBlocks = useSelectedBlocks(editor);

  const currentColor = useMemo(() => {
    const block = selectedBlocks[0];
    if (!block || block.type !== "table") return undefined;

    const cellSelection = editor.tableHandles?.getCellSelection();
    if (!cellSelection || cellSelection.cells.length === 0) return undefined;

    const colors = cellSelection.cells.map(
      ({ row, col }) =>
        mapTableCell(
          (block.content as TableContent<any, any>).rows[row].cells[col],
        ).props.backgroundColor,
    );

    const first = colors[0];
    return colors.every((c) => c === first) ? first : undefined;
  }, [editor, selectedBlocks]);

  const setBackgroundColor = useCallback(
    (color: string) => {
      editor.focus();

      for (const block of selectedBlocks) {
        if (block.type !== "table") continue;

        const cellSelection = editor.tableHandles?.getCellSelection();
        if (!cellSelection) continue;

        const newTable = (block.content as TableContent<any, any>).rows.map(
          (row) => ({
            ...row,
            cells: row.cells.map((cell) => mapTableCell(cell)),
          }),
        );

        cellSelection.cells.forEach(({ row, col }) => {
          newTable[row].cells[col].props.backgroundColor = color;
        });

        // Save cell positions before update
        const savedCells = cellSelection.cells;

        editor.updateBlock(block, {
          type: "table",
          content: {
            ...(block.content as TableContent<any, any>),
            type: "tableContent",
            rows: newTable,
          } as any,
        });

        // Restore multi-cell selection instead of collapsing to text cursor
        const view = editor.prosemirrorView;
        if (view && savedCells.length > 0) {
          const { state } = view;
          // Find the table node position in the updated doc
          let tableStart = -1;
          state.doc.descendants((node, pos) => {
            if (node.type.name === "table" && tableStart === -1) {
              const map = TableMap.get(node);
              if (map) {
                tableStart = pos + 1; // +1 to get inside the table
                return false;
              }
            }
            return tableStart === -1;
          });

          if (tableStart > 0) {
            try {
              const tableNode = state.doc.nodeAt(tableStart - 1);
              if (tableNode) {
                const map = TableMap.get(tableNode);
                const first = savedCells[0];
                const last = savedCells[savedCells.length - 1];
                const anchorPos =
                  tableStart + map.map[first.row * map.width + first.col];
                const headPos =
                  tableStart + map.map[last.row * map.width + last.col];
                const $anchor = state.doc.resolve(anchorPos);
                const $head = state.doc.resolve(headPos);
                const sel = new CellSelection($anchor, $head);
                view.dispatch(state.tr.setSelection(sel));
              }
            } catch {
              // Fallback if selection restoration fails
              editor.setTextCursorPosition(block);
            }
          } else {
            editor.setTextCursorPosition(block);
          }
        }
      }
    },
    [editor, selectedBlocks],
  );

  const show = useMemo(() => {
    return selectedBlocks.some(
      (block) =>
        block.type === "table" &&
        editor.tableHandles?.getCellSelection()?.cells?.length,
    );
  }, [editor, selectedBlocks]);

  if (!show || !editor.isEditable) {
    return null;
  }

  return (
    <Components.Generic.Menu.Root position={"bottom"}>
      <Components.Generic.Menu.Trigger>
        <Components.FormattingToolbar.Button
          className="bn-button"
          label="Cell background color"
          mainTooltip="Cell background color"
          icon={<RiPaintFill />}
          isSelected={currentColor !== undefined && currentColor !== "default"}
        />
      </Components.Generic.Menu.Trigger>
      <Components.Generic.Menu.Dropdown className="bn-menu-dropdown bn-color-picker-dropdown">
        <Components.Generic.Menu.Label>
          Background Color
        </Components.Generic.Menu.Label>
        {BG_COLORS.map((color) => (
          <Components.Generic.Menu.Item
            key={color.value}
            onClick={() => setBackgroundColor(color.value)}
            checked={currentColor === color.value}
            icon={
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  backgroundColor: color.hex,
                  border: "1px solid #d1d5db",
                }}
              />
            }
          >
            {color.name}
          </Components.Generic.Menu.Item>
        ))}
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
};
