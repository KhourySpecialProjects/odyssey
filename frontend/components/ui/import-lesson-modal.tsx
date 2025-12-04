"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Tabs } from "@mantine/core"; 

interface ImportLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (markdown: string) => Promise<void>;
  dropletName: string;
}

export function ImportLessonModal({
  isOpen,
  onClose,
  onImport,
  dropletName,
}: ImportLessonModalProps) {
  const [markdown, setMarkdown] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await onImport(markdown);
      setMarkdown(""); // Clear on success
      onClose();
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "text/markdown" || file.name.endsWith(".md"))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setMarkdown(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Lesson from Markdown</DialogTitle>
          <DialogDescription>
            Import a lesson into <strong>{dropletName}</strong> using our
            markdown format
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="format" className="w-full">
          <Tabs.List grow>
            <Tabs.Tab value="format">Format Guide</Tabs.Tab>
            <Tabs.Tab value="import">Import</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="format" pt="md">
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Your markdown file must follow this specific format to be
                      imported successfully.
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Note: Executable code blocks must be added manually in the
                      editor after import.
                    </p>
                  </div>
                </div>
              </div>

              {/* Standard Markdown Features */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">
                  Standard Markdown Features
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="rounded border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <p className="font-medium mb-2">Structure & Text:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                      <li>
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded dark:bg-slate-800">
                          # Heading 1
                        </code>{" "}
                        - Main lesson title (first H1 becomes lesson name)
                      </li>
                      <li>
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded dark:bg-slate-800">
                          ## Heading 2
                        </code>
                      </li>
                      <li>
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded dark:bg-slate-800">
                          ### Heading 3
                        </code>
                      </li>
                      <li>Regular paragraph text</li>
                      <li>
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded dark:bg-slate-800">
                          1. Numbered
                        </code>{" "}
                        lists
                      </li>
                      <li>
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded dark:bg-slate-800">
                          - Bulleted
                        </code>{" "}
                        lists
                      </li>
                      <li>Tables (standard markdown table syntax)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Custom Blocks - Callouts */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">
                  Custom Blocks - Callouts & Media
                </h3>
                <div className="rounded border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-sm mb-2">
                    Use{" "}
                    <code className="text-xs bg-slate-100 px-1 py-0.5 rounded dark:bg-slate-800">
                      %blockname
                    </code>{" "}
                    followed by content on the same line:
                  </p>
                  <div className="space-y-2 text-sm font-mono bg-slate-50 p-3 rounded dark:bg-slate-800">
                    <p className="text-slate-700 dark:text-slate-300">
                      %warning This is a warning message
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      %question What is the answer to this?
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      %important Remember this key point
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      %definition Term: explanation here
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      %more-information Additional context
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      %caution Proceed with care
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      %default Generic callout
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Blocks - Quizzes */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">
                  Custom Blocks - Quizzes
                </h3>
                <div className="rounded border border-slate-200 bg-white p-3 space-y-4 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-sm">
                    Use{" "}
                    <code className="text-xs bg-slate-100 px-1 py-0.5 rounded dark:bg-slate-800">
                      %%quiztype
                    </code>{" "}
                    followed by bulleted list:
                  </p>

                  {/* True/False Example */}
                  <div>
                    <p className="text-sm font-medium mb-2">True/False Quiz:</p>
                    <div className="font-mono text-sm bg-slate-50 p-3 rounded space-y-1 dark:bg-slate-800">
                      <p className="text-slate-700 dark:text-slate-300">
                        %%true-false
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">
                        - The sky is blue
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">
                        - true
                      </p>
                    </div>
                  </div>

                  {/* Open-Ended Example */}
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Open-Ended Quiz:
                    </p>
                    <div className="font-mono text-sm bg-slate-50 p-3 rounded space-y-1 dark:bg-slate-800">
                      <p className="text-slate-700 dark:text-slate-300">
                        %%open-ended
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">
                        - Simon Says, "Hello World"
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">
                        - Hello World
                      </p>
                    </div>
                  </div>

                  {/* Multiple Choice Example */}
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Multiple Choice Quiz:
                    </p>
                    <div className="font-mono text-sm bg-slate-50 p-3 rounded space-y-1 dark:bg-slate-800">
                      <p className="text-slate-700 dark:text-slate-300">
                        %%multiple-choice
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">
                        - What is 2 + 2?
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">- 3</p>
                      <p className="text-slate-700 dark:text-slate-300">
                        - 4 &lt;
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">- 5</p>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 dark:text-slate-400">
                      Mark the correct answer with{" "}
                      <code className="bg-slate-100 px-1 py-0.5 rounded dark:bg-slate-800">
                        &lt;
                      </code>{" "}
                      at the end
                    </p>
                  </div>
                </div>
              </div>

              {/* LaTeX Example */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">LaTeX Formulas</h3>
                <div className="rounded border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-sm mb-2">Use standard LaTeX delimiters:</p>
                  <div className="space-y-2 text-sm font-mono bg-slate-50 p-3 rounded dark:bg-slate-800">
                    <p className="text-slate-700 dark:text-slate-300">
                      Inline: <code>$x^2 + y^2 = r^2$</code>
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      Block: <code>$$\frac{"{a}"}{"{b}"}$$</code>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="import" pt="md">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="markdown-input">
                  Paste Markdown or Upload File
                </Label>
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      document.getElementById("file-upload")?.click()
                    }
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload .md File
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".md,.markdown"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <Textarea
                  id="markdown-input"
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="# My Lesson Title

## Introduction

This is a paragraph...

%warning Important safety information

%%true-false
- React is a framework
- false"
                  className="min-h-[400px] font-mono text-sm"
                />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {markdown.split("\n").length} lines • {markdown.length}{" "}
                  characters
                </p>
              </div>
            </div>
          </Tabs.Panel>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!markdown || isImporting}>
            {isImporting ? (
              <>
                <FileText className="mr-2 h-4 w-4 animate-pulse" />
                Importing...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Import Lesson
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}