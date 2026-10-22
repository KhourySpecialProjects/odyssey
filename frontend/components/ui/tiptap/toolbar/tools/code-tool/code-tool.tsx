import { cn } from "@/lib/utils";
import { Editor, NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { CodeIcon } from "lucide-react";
import { NodeViewProps } from "@tiptap/react";

interface CodeBlockProps extends NodeViewProps {
  node: NodeViewProps["node"] & {
    attrs: {
      language?: string;
    };
  };
  extension: NodeViewProps["extension"] & {
    options: {
      lowlight: {
        listLanguages: () => string[];
      };
    };
  };
}

function CodeBlockComponent({
  node,
  node: {
    attrs: { language: defaultLanguage },
  },
  updateAttributes,
  extension,
}: CodeBlockProps) {
  const lineCount = (node.textContent.match(/\n/g) || []).length + 1;

  return (
    <NodeViewWrapper className="code-block my-2">
      <div className="flex justify-end">
        <select
          contentEditable={false}
          defaultValue={defaultLanguage}
          onChange={(event) =>
            updateAttributes({ language: event.target.value })
          }
          className="rounded-t border border-b-0 border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
        >
          <option value="null">auto</option>
          <option disabled>—</option>
          {extension.options.lowlight
            .listLanguages()
            .map((lang: string, index: number) => (
              <option key={index} value={lang}>
                {lang}
              </option>
            ))}
        </select>
      </div>
      {/* mt-0 overrides Tailwind Typography's default pre margin-top */}
      <pre className="relative mt-0 overflow-x-auto rounded-tl-md rounded-b-md border border-gray-200 bg-gray-50 py-3 pr-4 pl-12 dark:border-slate-700 dark:bg-slate-900">
        <div className="absolute top-3 bottom-3 left-0 flex min-w-[2.5rem] flex-col border-r border-gray-200 bg-gray-100 text-sm text-gray-400 select-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          {Array.from({ length: lineCount }).map((_, i) => (
            <div
              key={i}
              className="pr-2 text-right font-mono"
              style={{
                lineHeight: "1.25rem",
                height: "1.25rem",
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <NodeViewContent
          as="code"
          className="block font-mono text-sm whitespace-pre text-gray-800 dark:text-slate-50"
          style={{ lineHeight: "1.25rem" }}
        />
      </pre>
    </NodeViewWrapper>
  );
}

function CodeTool({ editor }: { editor: Editor }) {
  return (
    <button
      onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      className={cn(
        editor?.isActive("codeBlock") ? "bg-slate-200 dark:bg-slate-700" : "",
        "rounded-md border border-transparent p-2.5 hover:border-slate-200",
      )}
      title="Code"
    >
      <CodeIcon size={17} />
    </button>
  );
}

export { CodeBlockComponent };
export default CodeTool;
