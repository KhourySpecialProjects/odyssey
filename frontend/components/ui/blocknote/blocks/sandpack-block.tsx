"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { ErrorInfo } from "react";
import React from "react";
import dynamic from "next/dynamic";

// Dynamic import keeps @codesandbox/sandpack-react out of the synchronous
// webpack module graph so it doesn't conflict with BlockNoteSchema.create().
const SandpackBlockContent = dynamic(
  () => import("./sandpack-block-content").then((m) => m.SandpackBlockContent),
  {
    ssr: false,
    loading: () => (
      <div className="my-4 w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-900 p-4">
        <div className="animate-pulse">
          <div className="mb-4 h-4 w-1/4 rounded bg-gray-700"></div>
          <div className="h-64 rounded bg-gray-800"></div>
        </div>
      </div>
    ),
  },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SandpackBlockComponent = ({ block, editor }: any) => (
  <SandpackBlockContent block={block} editor={editor} />
);

class SandpackBlockErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SandpackBlock Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-4 w-full rounded-lg border border-red-700 bg-red-50 p-4 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">
            Live sandbox failed to load. Try refreshing the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export const SandpackBlock = createReactBlockSpec(
  {
    type: "sandpack-block",
    propSchema: {
      template: {
        default: "vanilla",
      },
      files: {
        default: "{}",
      },
      showPreview: {
        default: true,
      },
      editable: {
        default: true,
      },
    },
    content: "none",
  },
  {
    render: (props) => (
      <SandpackBlockErrorBoundary>
        <SandpackBlockComponent {...props} />
      </SandpackBlockErrorBoundary>
    ),
  },
);
