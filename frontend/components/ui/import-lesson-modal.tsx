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
import { Upload, FileText, AlertCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";

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
  const [showGuide, setShowGuide] = useState(false);

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
    if (!file) return;

    // Check file type
    if (
      !file.type.includes("markdown") &&
      !file.name.endsWith(".md") &&
      !file.name.endsWith(".markdown")
    ) {
      toast.error("Please upload a .md or .markdown file");
      return;
    }

    // Check file size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 5MB");
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      setMarkdown(content);
      toast.success(`File "${file.name}" loaded successfully`);
    };

    reader.onerror = () => {
      toast.error("Failed to read file");
    };

    reader.readAsText(file);

    // Reset the input so the same file can be selected again if needed
    e.target.value = "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Lesson from Markdown</DialogTitle>
          <DialogDescription>
            Import a lesson into <strong>{dropletName}</strong> using our
            markdown format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Banner */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Your markdown must follow our specific format
                </p>
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <BookOpen className="h-3 w-3" />
                  {showGuide ? "Hide" : "View"} format guide
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Format Guide */}
          {showGuide && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              {/* Standard Markdown Features */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Standard Markdown</h3>
                <ul className="list-inside list-disc space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-700">
                      # H1
                    </code>{" "}
                    (first one becomes lesson title)
                  </li>
                  <li>
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-700">
                      ## H2
                    </code>{" "}
                    and{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-700">
                      ### H3
                    </code>
                  </li>
                  <li>Paragraphs, numbered lists, bulleted lists, tables</li>
                </ul>
              </div>

              {/* Custom Callouts */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  Callouts (use %blockname)
                </h3>
                <div className="space-y-1 rounded bg-white p-2 font-mono text-xs dark:bg-slate-900">
                  <p className="text-slate-700 dark:text-slate-300">
                    %warning This is important
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    %question What is this?
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    (Also: %important, %definition, %more-information, %caution,
                    %default)
                  </p>
                </div>
              </div>

              {/* Quizzes */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  Quizzes (use %%quiztype)
                </h3>
                <div className="space-y-2 rounded bg-white p-2 font-mono text-xs dark:bg-slate-900">
                  <div>
                    <p className="mb-1 text-slate-600 dark:text-slate-400">
                      True/False:
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      %%true-false
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      - Is this true?
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">- true</p>
                  </div>
                  <div>
                    <p className="mb-1 text-slate-600 dark:text-slate-400">
                      Multiple Choice (mark correct with &lt;):
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      %%multiple-choice
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      - What is 2+2?
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">- 3</p>
                    <p className="text-slate-700 dark:text-slate-300">
                      - 4 &lt;
                    </p>
                  </div>
                </div>
              </div>

              {/* LaTeX */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">LaTeX</h3>
                <div className="rounded bg-white p-2 font-mono text-xs dark:bg-slate-900">
                  <p className="text-slate-700 dark:text-slate-300">
                    Inline: $x^2 + y^2 = r^2$
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    Block: $$\frac{"{a}"}
                    {"{b}"}$$
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 italic dark:text-slate-400">
                Note: Code blocks must be added manually after import
              </p>
            </div>
          )}

          {/* File Upload Section */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload Markdown File</Label>
            <div
              onClick={() => document.getElementById("file-upload")?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition-colors hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500 dark:hover:bg-slate-700"
            >
              <Upload className="mb-3 h-12 w-12 text-slate-400" />
              <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Click to upload markdown file
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Accepts .md and .markdown files (max 5MB)
              </p>
            </div>
            <input
              id="file-upload"
              type="file"
              accept=".md,.markdown"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                Or paste markdown
              </span>
            </div>
          </div>

          {/* Paste Markdown Section */}
          <div className="space-y-2">
            <Label htmlFor="markdown-input">Paste Markdown Content</Label>
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
              className="min-h-[300px] font-mono text-sm"
            />
            {markdown && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {markdown.split("\n").length} lines • {markdown.length}{" "}
                characters
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || !markdown.trim()}
          >
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
