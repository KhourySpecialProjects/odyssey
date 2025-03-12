"use client";

import { Editor } from "@tiptap/react";
import BoldTool from "./tools/bold-tool";
import ItalicTool from "./tools/italic-tool";
import UnderlineTool from "./tools/underline-tool";
import StrikeTool from "./tools/strike-tool";
import UnorderedListTool from "./tools/unordered-list-tool";
import OrderedListTool from "./tools/ordered-list-tool";
import LinkTool from "./tools/link-tool";
import ImageTool from "./tools/image-tool";
import CodeTool from "./tools/code-tool/code-tool";
import HeadingTool from "./tools/heading-tool";
import LatexTool from "./tools/latex-tool";

export default function DefaultToolbar({
  editor,
  note,
  isDroplet,
}: {
  editor: Editor;
  note?: boolean | null;
  isDroplet?: boolean;
}) {
  return (
    <div
      className={`w-full  ${note ? "rounded-tl-md" : "rounded-t-md border border-b-transparent border-slate-200"}  dark:border-slate-500 light:bg-white p-1 dark:bg-slate-800 space-x-0.5`}
    >
      <BoldTool editor={editor} />
      <ItalicTool editor={editor} />
      <UnderlineTool editor={editor} />
      <StrikeTool editor={editor} />
      {!note && (
        <>
          <UnorderedListTool editor={editor} />
          <OrderedListTool editor={editor} />
          <LinkTool editor={editor} />
          <ImageTool editor={editor} />
          <CodeTool editor={editor} />

          <HeadingTool editor={editor} number={1} />
          <HeadingTool editor={editor} number={2} />
          <HeadingTool editor={editor} number={3} />
          {isDroplet && <LatexTool editor={editor} />}
        </>
      )}
    </div>
  );
}
