"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
import { useTheme } from "next-themes";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { php } from "@codemirror/lang-php";
import { rust } from "@codemirror/lang-rust";
import { json } from "@codemirror/lang-json";
import { StreamLanguage } from "@codemirror/language";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { go } from "@codemirror/legacy-modes/mode/go";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { csharp } from "@codemirror/legacy-modes/mode/clike";
import { kotlin } from "@codemirror/legacy-modes/mode/clike";
import { swift } from "@codemirror/legacy-modes/mode/swift";
import type { Extension } from "@codemirror/state";
import { cn } from "@/lib/utils";

function getLanguageExtension(language: string): Extension | null {
  switch (language) {
    case "python":
      return python();
    case "javascript":
      return javascript({ jsx: true });
    case "typescript":
      return javascript({ jsx: true, typescript: true });
    case "java":
      return java();
    case "cpp":
    case "c":
      return cpp();
    case "php":
      return php();
    case "rust":
      return rust();
    case "go":
      return StreamLanguage.define(go);
    case "ruby":
      return StreamLanguage.define(ruby);
    case "bash":
      return StreamLanguage.define(shell);
    case "csharp":
      return StreamLanguage.define(csharp);
    case "kotlin":
      return StreamLanguage.define(kotlin);
    case "swift":
      return StreamLanguage.define(swift);
    case "json":
      return json();
    case "plaintext":
    default:
      return null;
  }
}

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  className?: string;
  minHeight?: string;
  placeholder?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = "python",
  readOnly = false,
  className,
  minHeight = "60px",
  placeholder,
}: CodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const cmTheme = resolvedTheme === "dark" ? githubDark : githubLight;

  const extensions = useMemo(() => {
    const ext: Extension[] = [];
    if (!readOnly) ext.push(keymap.of([indentWithTab]));
    const langExt = getLanguageExtension(language);
    if (langExt) ext.push(langExt);
    return ext;
  }, [language, readOnly]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={cmTheme}
      extensions={extensions}
      readOnly={readOnly}
      editable={!readOnly}
      placeholder={placeholder}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: !readOnly,
        bracketMatching: true,
        indentOnInput: true,
        autocompletion: false,
      }}
      className={cn("text-[13px]", className)}
      style={{ minHeight }}
    />
  );
}
