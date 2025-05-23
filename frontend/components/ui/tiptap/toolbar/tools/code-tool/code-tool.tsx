import "./CodeEditorComponent.css";
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
  return (
    <NodeViewWrapper className="code-block">
      <select
        contentEditable={false}
        defaultValue={defaultLanguage}
        onChange={(event) => updateAttributes({ language: event.target.value })}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-black"
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
      <pre className="overflow-x-auto py-3 pr-4 pl-12">
        <div className="absolute top-0 bottom-0 left-0 flex min-w-[2.5rem] flex-col border-r border-slate-300 bg-slate-50 text-sm text-slate-500 select-none">
          <div className="pt-3 pl-3">
            {Array.from({
              length: (node.textContent.match(/\n/g) || []).length + 1,
            }).map((_, i) => (
              <span
                key={i}
                className="block pr-2 text-right leading-5"
                style={{ paddingTop: "0.15rem", paddingBottom: "0.15rem" }}
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        <NodeViewContent
          as="code"
          className="block min-w-full overflow-x-auto whitespace-pre"
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
