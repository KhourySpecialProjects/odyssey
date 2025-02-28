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
        className="text-sm rounded-md px-2 py-1 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-black"
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
      <pre className="pl-12 pr-4 py-3 overflow-x-auto">
        <div className="absolute left-0 top-0 bottom-0 min-w-[2.5rem] flex flex-col text-slate-500 text-sm select-none border-r border-slate-300 bg-slate-50">
          <div className="pt-3 pl-3">
            {Array.from({
              length: (node.textContent.match(/\n/g) || []).length + 1,
            }).map((_, i) => (
              <span key={i} className="text-right pr-2 py-0.5 leading-5 block">
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        <NodeViewContent as="code" className="block" />
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
        "p-2.5 rounded-md border border-transparent hover:border-slate-200",
      )}
    >
      <CodeIcon size={17} />
    </button>
  );
}

export { CodeBlockComponent };
export default CodeTool;
