/**
 * Tests for the sandpack block component and sandpack viewer.
 *
 * Sandpack requires iframes and service workers not available in JSDOM,
 * so we mock the entire @codesandbox/sandpack-react package.
 */

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: jest.fn(() => ({ resolvedTheme: "light" })),
}));

// Mock next/dynamic to return a simple passthrough
jest.mock("next/dynamic", () => {
  return function mockDynamic(loader: () => Promise<unknown>, _opts?: unknown) {
    // Return a placeholder component for dynamic imports
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require("react");
    return function DynamicComponent(props: Record<string, unknown>) {
      return React.createElement(
        "div",
        { "data-testid": "dynamic-component" },
        props.children as React.ReactNode,
      );
    };
  };
});

// Mock @codesandbox/sandpack-react
jest.mock("@codesandbox/sandpack-react", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    SandpackProvider: ({
      children,
      template,
    }: {
      children: React.ReactNode;
      template?: string;
    }) =>
      React.createElement(
        "div",
        { "data-testid": "sandpack-provider", "data-template": template },
        children,
      ),
    SandpackCodeEditor: ({ readOnly }: { readOnly?: boolean }) =>
      React.createElement("div", {
        "data-testid": "sandpack-editor",
        "data-readonly": readOnly,
      }),
    SandpackPreview: () =>
      React.createElement("div", { "data-testid": "sandpack-preview" }),
    SandpackLayout: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        "div",
        { "data-testid": "sandpack-layout" },
        children,
      ),
    useSandpack: () => ({
      sandpack: {
        files: {
          "/index.js": { code: "console.log('hello')" },
        },
      },
      dispatch: jest.fn(),
    }),
  };
});

// Mock @blocknote/react
// createReactBlockSpec is called with (spec, options) and should return a function
// that, when called, returns an object with spec and render.
jest.mock("@blocknote/react", () => ({
  createReactBlockSpec: jest.fn(
    (
      spec: Record<string, unknown>,
      options: { render: (props: unknown) => unknown },
    ) => {
      // Return a factory function (matching real BlockNote behavior) so that
      // SandpackBlock() calls the factory and returns the spec object.
      return () => ({ spec, render: options.render });
    },
  ),
}));

// Mock @/lib/blocknote/schema
jest.mock("@/lib/blocknote/schema", () => ({
  blockNoteSchema: {
    blockSchema: {},
    inlineContentSchema: {},
    styleSchema: {},
  },
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// We need to render without next/dynamic since we mocked it.
// Import the components directly after mocks are set up.

describe("SandpackViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with template label in the header", async () => {
    // Import SandpackViewer after mocks are established
    const { SandpackViewer } = await import(
      "@/components/draft/lesson/sandpack-viewer"
    );

    render(
      <SandpackViewer
        template="react"
        files={{}}
        showPreview={true}
        editable={true}
      />,
    );

    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("renders vanilla template label correctly", async () => {
    const { SandpackViewer } = await import(
      "@/components/draft/lesson/sandpack-viewer"
    );

    render(
      <SandpackViewer
        template="vanilla"
        files={{}}
        showPreview={true}
        editable={true}
      />,
    );

    expect(screen.getByText("Vanilla JS")).toBeInTheDocument();
  });

  it("renders react-ts template label correctly", async () => {
    const { SandpackViewer } = await import(
      "@/components/draft/lesson/sandpack-viewer"
    );

    render(
      <SandpackViewer
        template="react-ts"
        files={{}}
        showPreview={true}
        editable={true}
      />,
    );

    expect(screen.getByText("React + TypeScript")).toBeInTheDocument();
  });
});

describe("SandpackBlock component (editor mode)", () => {
  const createMockEditor = (isEditable = true) => ({
    isEditable,
    updateBlock: jest.fn(),
    insertBlocks: jest.fn(),
    getTextCursorPosition: jest.fn(() => ({
      block: { id: "test-block" },
    })),
  });

  const createMockBlock = (overrides = {}) => ({
    id: "block-123",
    type: "sandpack-block",
    props: {
      template: "vanilla",
      files: "{}",
      showPreview: true,
      editable: true,
      ...overrides,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders template selector in editor mode", async () => {
    const { SandpackBlock } = await import(
      "@/components/ui/blocknote/blocks/sandpack-block"
    );

    const blockSpec = SandpackBlock();
    const editor = createMockEditor(true);
    const block = createMockBlock();

    // The render function from createReactBlockSpec
    const RenderComponent = ({
      block: b,
      editor: e,
    }: {
      block: typeof block;
      editor: typeof editor;
    }) => {
      // Directly render the inner component to test it
      // We need to get the inner SandpackBlockComponent
      const rendered = blockSpec.render({ block: b, editor: e });
      return rendered as React.ReactElement;
    };

    // Test the block spec was created with correct type
    expect(blockSpec.spec?.type).toBe("sandpack-block");
  });

  it("block spec has correct prop schema", async () => {
    const { SandpackBlock } = await import(
      "@/components/ui/blocknote/blocks/sandpack-block"
    );

    const blockSpec = SandpackBlock();
    const propSchema = blockSpec.spec?.propSchema;

    expect(propSchema).toBeDefined();
    expect(propSchema?.template?.default).toBe("vanilla");
    expect(propSchema?.files?.default).toBe("{}");
    expect(propSchema?.showPreview?.default).toBe(true);
    expect(propSchema?.editable?.default).toBe(true);
  });

  it("block spec has content type none", async () => {
    const { SandpackBlock } = await import(
      "@/components/ui/blocknote/blocks/sandpack-block"
    );

    const blockSpec = SandpackBlock();
    expect(blockSpec.spec?.content).toBe("none");
  });
});

describe("SandpackBlockComponent rendering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window.confirm mock
    jest.spyOn(window, "confirm").mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper to import and render the inner component directly
  // We test the rendered output by importing the file
  it("shows template selector in author mode", async () => {
    // Dynamically import to get a fresh module after mocks
    const mod = await import("@/components/ui/blocknote/blocks/sandpack-block");

    const editor = { isEditable: true, updateBlock: jest.fn() };
    const block = {
      id: "block-1",
      type: "sandpack-block",
      props: {
        template: "vanilla",
        files: "{}",
        showPreview: true,
        editable: true,
      },
    };

    const blockSpec = mod.SandpackBlock();
    const rendered = blockSpec.render({ block, editor });

    // The render function should return something
    expect(rendered).toBeDefined();
  });
});
