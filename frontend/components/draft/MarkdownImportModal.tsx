"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createDropletFromMarkdown } from "@/lib/requests/droplet";
import { toast } from "sonner";

type MarkdownImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type ImportVersion = "v1" | "v2";

export function MarkdownImportModal({ isOpen, onClose }: MarkdownImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [importVersion, setImportVersion] = useState<ImportVersion>("v2");
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.md')) {
      setFile(selectedFile);
    } else {
      toast.error("Please select a valid markdown (.md) file");
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const result = await createDropletFromMarkdown(text, importVersion);

      if (result.ok && result.data) {
        toast.success("Droplet created successfully!");
        router.push(`/draft/d/${result.data.slug}`);
        onClose();
      } else {
        toast.error(result.error || "Failed to import markdown");
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("An error occurred while importing the markdown");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const v2Example = `# Introduction to React

## Metadata
- **Description:** Learn the fundamentals of React
- **Tags:** react, javascript, frontend
- **Focus Area:** Professional
- **Type:** Skill

## Getting Started

React is a **JavaScript library** for building user interfaces.

### Why Learn React?

React has become popular because:

- **Component-Based**: Build encapsulated components
- **Declarative**: Design simple views
- **Learn Once, Write Anywhere**: Create without rewriting

## Core Concepts

### Components

Components are the building blocks:

\`\`\`jsx
function Welcome() {
  return <h1>Hello, World!</h1>;
}
\`\`\`

### State

Use \`useState\` for component state:

\`\`\`jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>
    Count: {count}
  </button>;
}
\`\`\``;

  const v1Example = `# Testing Imports

## **Metadata**

Type: skill
Focus Area: personal

### Tags
* react
* javascript
* frontend

### Authors
* Johan Almanzar

### Description
<p>Learn the fundamentals of React</p>

### Overview
<p>A comprehensive introduction to React</p>

### Learning Objectives
* Understand React components
* Learn state management

### Next Steps
* Advanced React Patterns linked to: /advanced

### Prerequisites
* JavaScript Fundamentals

### Postrequisites
No postreqs

## **Lessons**

### Introduction

#### Generic Droplet

<p>React is a <strong>JavaScript library</strong> for building user interfaces.</p>

#### Callout Droplet

Color: bg-blue-300
Type: info

React was created by Facebook!

#### Expandable Droplet

##### Why Learn React?

<p>React has become one of the most popular choices for building modern web applications.</p>

### Core Concepts

#### Generic Droplet

<p>Components are the building blocks of any React application.</p>

#### Quiz

1. <p>React is a JavaScript library?</p>
   1. Answer: <p>True</p> is correct
   2. Answer: <p>False</p> is incorrect

#### Open-Ended Quiz

1. <p>What does JSX stand for?</p>
   * Answer: JavaScript XML`;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Import Markdown Droplet
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {!showExample ? (
            <>
              {/* Version Selection */}
              <div className="mb-6">
                <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                  Select Import Format
                </h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => setImportVersion("v2")}
                    className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors ${
                      importVersion === "v2"
                        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-gray-300 bg-white text-gray-900 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    }`}
                  >
                    <div className="mb-1 font-semibold">Version 2 (Standard Markdown)</div>
                    <div className="text-sm opacity-80">
                      Clean markdown with headings, lists, code blocks
                    </div>
                  </button>
                  <button
                    onClick={() => setImportVersion("v1")}
                    className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors ${
                      importVersion === "v1"
                        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-gray-300 bg-white text-gray-900 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    }`}
                  >
                    <div className="mb-1 font-semibold">Version 1 (Custom Format)</div>
                    <div className="text-sm opacity-80">
                      Odyssey export format with custom blocks
                    </div>
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {importVersion === "v2" ? "Standard Markdown" : "Custom Format"} Requirements
                </h3>
                {importVersion === "v2" ? (
                  <ul className="list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
                    <li>File must contain at least one H1 heading (<code className="rounded bg-gray-100 px-1 dark:bg-gray-700"># Title</code>)</li>
                    <li>The first H1 will be used as the droplet name and to generate the URL slug</li>
                    <li>H2 headings (<code className="rounded bg-gray-100 px-1 dark:bg-gray-700">## Lesson Name</code>) create separate lessons</li>
                    <li>Content under each H2 becomes lesson content in BlockNote format</li>
                    <li>Metadata section (optional) can define tags, description, focus area, type</li>
                    <li>Supports standard markdown: **bold**, *italic*, `code`, lists, code blocks</li>
                  </ul>
                ) : (
                  <ul className="list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
                    <li>File must contain an H1 heading for the droplet name</li>
                    <li><code className="rounded bg-gray-100 px-1 dark:bg-gray-700">## **Metadata**</code> section with structured fields</li>
                    <li><code className="rounded bg-gray-100 px-1 dark:bg-gray-700">## **Lessons**</code> section where H3 headings are lesson names</li>
                    <li>Lessons contain custom blocks: Generic Droplet, Callout Droplet, Expandable Droplet, Quiz, etc.</li>
                    <li>HTML content within blocks is preserved</li>
                    <li>This format matches exported droplets from Odyssey</li>
                  </ul>
                )}
              </div>

              {/* File Upload */}
              <div className="mb-4">
                <label
                  htmlFor="markdown-file"
                  className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                >
                  Select Markdown File
                </label>
                <div className="flex items-center gap-4">
                  <input
                    id="markdown-file"
                    type="file"
                    accept=".md"
                    onChange={handleFileChange}
                    className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  />
                  {file && (
                    <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <FileText className="h-4 w-4" />
                      {file.name}
                    </span>
                  )}
                </div>
              </div>

              <Button
                onClick={() => setShowExample(true)}
                variant="outline"
                className="mb-4 w-full"
              >
                View {importVersion === "v2" ? "Standard Markdown" : "Custom Format"} Example
              </Button>
            </>
          ) : (
            <div className="mb-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {importVersion === "v2" ? "Standard Markdown" : "Custom Format"} Example
                </h3>
                <Button
                  onClick={() => setShowExample(false)}
                  variant="outline"
                  size="sm"
                >
                  Back
                </Button>
              </div>
              <pre className="max-h-96 overflow-y-auto rounded-lg bg-gray-100 p-4 text-xs dark:bg-gray-900">
                {importVersion === "v2" ? v2Example : v1Example}
              </pre>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || isProcessing}
              className="bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              {isProcessing ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Droplet
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}