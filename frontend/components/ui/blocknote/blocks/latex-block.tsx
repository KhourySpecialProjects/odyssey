"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { useState, useEffect, useRef } from "react";
import { TypeIcon, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import katex from "katex";
import "katex/dist/katex.min.css";

export const LatexBlock = createReactBlockSpec(
  {
    type: "latex",
    propSchema: {
      content: {
        default: "",
      },
      displayMode: {
        default: true, // Always use display mode
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      const [isEditing, setIsEditing] = useState(false);
      const [editContent, setEditContent] = useState(props.block.props.content);
      const [previewHtml, setPreviewHtml] = useState("");
      const [hasError, setHasError] = useState(false);
      const [hasOpenedInitially, setHasOpenedInitially] = useState(false);
      const textareaRef = useRef<HTMLTextAreaElement>(null);

      // Auto-open dialog when block is first created (empty content)
      useEffect(() => {
        if (!hasOpenedInitially && !props.block.props.content) {
          setIsEditing(true);
          setHasOpenedInitially(true);
        }
      }, [props.block.props.content, hasOpenedInitially]);

      // Update edit content when block content changes
      useEffect(() => {
        setEditContent(props.block.props.content);
      }, [props.block.props.content]);

      // Reset textarea state when dialog opens (but don't auto-focus to allow clicking)
      useEffect(() => {
        if (isEditing && textareaRef.current) {
          // Clear any programmatic focus - let user click to position cursor
          // The textarea will be ready for normal interaction
        }
      }, [isEditing]);

      // Render preview
      useEffect(() => {
        const content = editContent || "";
        if (!content.trim()) {
          setPreviewHtml("");
          setHasError(false);
          return;
        }

        try {
          const html = katex.renderToString(content, {
            throwOnError: false,
            displayMode: true, // Always use display mode
          });
          setPreviewHtml(html);
          setHasError(false);
        } catch (e) {
          setPreviewHtml(content);
          setHasError(true);
        }
      }, [editContent, isEditing]);

      const handleSave = () => {
        props.editor.updateBlock(props.block, {
          props: {
            content: editContent,
            displayMode: true, // Always use display mode
          },
        });
        setIsEditing(false);
      };

      const handleCancel = () => {
        setEditContent(props.block.props.content);
        setIsEditing(false);
      };

      return (
        <div
          className="relative my-4 rounded-md border border-slate-200 bg-slate-50 p-4 select-none dark:border-slate-700 dark:bg-slate-800"
          contentEditable={false}
          onMouseDown={(e) => {
            // Prevent selection when clicking anywhere on the block
            e.preventDefault();
            // Only allow the Edit button to be clickable
            if ((e.target as HTMLElement).closest("button")) {
              return;
            }
          }}
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: "default",
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TypeIcon size={16} className="text-slate-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                LaTeX
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="h-7 px-2"
            >
              <Edit2 size={14} className="mr-1" />
              Edit
            </Button>
          </div>

          {previewHtml ? (
            <div
              className={`min-h-[40px] overflow-x-auto select-none ${hasError ? "rounded bg-red-50 p-2 text-red-600 dark:bg-red-900/20 dark:text-red-400" : "p-2"}`}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
              onMouseDown={(e) => e.preventDefault()}
              style={{ userSelect: "none", WebkitUserSelect: "none" }}
            />
          ) : (
            <div className="min-h-[40px] rounded bg-slate-100 p-2 text-sm text-slate-400 dark:bg-slate-700">
              Click Edit to add LaTeX formula
            </div>
          )}

          {/* Edit Dialog */}
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent
              className="max-w-2xl"
              onMouseDown={(e) => {
                // Prevent the block's onMouseDown from interfering with dialog
                e.stopPropagation();
              }}
              onClick={(e) => {
                // Prevent event bubbling that might interfere
                e.stopPropagation();
              }}
            >
              <DialogHeader>
                <DialogTitle>Edit LaTeX Formula</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="latex-content">LaTeX Code</Label>
                  <Textarea
                    ref={textareaRef}
                    id="latex-content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onMouseDown={(e) => {
                      // Allow normal textarea clicking behavior - stop propagation to prevent block's preventDefault
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      // Ensure clicks work normally
                      e.stopPropagation();
                      // Focus the textarea on click
                      if (
                        textareaRef.current &&
                        document.activeElement !== textareaRef.current
                      ) {
                        textareaRef.current.focus();
                      }
                    }}
                    placeholder="Enter LaTeX formula (e.g., \\frac{a}{b}, \\sum_{i=1}^{n}, x^2 + y^2 = r^2)"
                    className="min-h-[150px] font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="min-h-[80px] rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    {previewHtml ? (
                      <div
                        className={`select-none ${hasError ? "text-red-600 dark:text-red-400" : ""}`}
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ userSelect: "none", WebkitUserSelect: "none" }}
                      />
                    ) : (
                      <span className="text-sm text-slate-400">
                        Enter LaTeX to see preview
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCancel}>
                  <X size={14} className="mr-1" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Check size={14} className="mr-1" />
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );
    },
  },
);
