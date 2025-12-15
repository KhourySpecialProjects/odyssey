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
    <NodeViewWrapper className="code-block my-4">
      <select
        contentEditable={false}
        defaultValue={defaultLanguage}
        onChange={(event) => updateAttributes({ language: event.target.value })}
        className="mb-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
      <pre className="relative overflow-x-auto rounded-md bg-slate-900 py-3 pl-12 pr-4 dark:bg-slate-950">
        <div className="absolute bottom-3 left-0 top-3 flex min-w-[2.5rem] select-none flex-col border-r border-slate-700 bg-slate-800 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
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
          className="block whitespace-pre font-mono text-sm text-slate-50"
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
