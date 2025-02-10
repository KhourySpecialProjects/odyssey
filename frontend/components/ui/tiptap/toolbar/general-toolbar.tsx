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
import FontColorTool from "./tools/font-color-tool";
import CalloutTypeTool from "./tools/callout-type-tool";

export default function DefaultToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="w-full border border-b-transparent rounded-t-md  border-slate-200 bg-white p-1 space-x-0.5">
      <BoldTool editor={editor} />
      <ItalicTool editor={editor} />
      <UnderlineTool editor={editor} />
      <StrikeTool editor={editor} />
      <UnorderedListTool editor={editor} />
      <OrderedListTool editor={editor} />
      <LinkTool editor={editor} />
      <ImageTool editor={editor} />
      <CodeTool editor={editor} />
      <HeadingTool editor={editor} number={1} />
      <HeadingTool editor={editor} number={2} />
      <HeadingTool editor={editor} number={3} />
    </div>
  );
}
