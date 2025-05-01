import { render, screen, fireEvent } from "@testing-library/react";
import { CalloutEditor } from "@/components/draft/lesson/blocks/callout";

jest.mock("@/lib/actions", () => ({
  revalidateLesson: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  strapiJSONToTiptapJSON: jest.fn(() => []),
  tiptapJSONToStrapiJSON: jest.fn(() => ({})),
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/tiptap/callout-block-input", () => ({
  CalloutBlockInput: ({
    updateContent,
  }: {
    updateContent: (content: any) => void;
  }) => (
    <div data-testid="callout-block-input">
      <button
        data-testid="update-content-button"
        onClick={() => updateContent({ content: [] })}
      >
        Update Content
      </button>
    </div>
  ),
}));

jest.mock("@/components/ui/callout-icons", () => ({
  CalloutIcon: ({ color }: { color: string }) => (
    <div data-testid="callout-icon" data-color={color}>
      Icon
    </div>
  ),
}));

jest.mock("@lemonsqueezy/wedges", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} data-testid="wedges-button">
      {children}
    </button>
  ),
}));

describe("CalloutEditor", () => {
  const mockBlock = {
    __component: "droplets.callout",
    content: [],
    type: "info",
    color: "bg-sky-50",
    iconEnabled: true,
  };

  const mockUpdateBlock = jest.fn();
  const mockDeleteBlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with correct block title", () => {
    render(
      <CalloutEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    expect(screen.getByText("Callout Block")).toBeInTheDocument();
  });

  it("calls updateBlock when content is updated", () => {
    render(
      <CalloutEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    fireEvent.click(screen.getByTestId("update-content-button"));

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.callout",
      content: expect.any(Object),
      type: "info",
    });
  });

  it("calls deleteBlock when delete button is clicked", () => {
    render(
      <CalloutEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    fireEvent.click(screen.getByRole("trash"));

    expect(mockDeleteBlock).toHaveBeenCalled();
  });

  it("toggles icon when icon button is clicked", () => {
    const nonSkyBlock = {
      ...mockBlock,
      color: "bg-red-300",
    };

    render(
      <CalloutEditor
        block={nonSkyBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    fireEvent.click(screen.getByTestId("wedges-button"));

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.callout",
      content: [],
      type: "info",
      color: "bg-red-300",
      iconEnabled: false,
    });
  });

  jest.mock("@/lib/actions", () => ({
    revalidateLesson: jest.fn(),
  }));

  describe("CalloutEditor", () => {
    const mockBlock = {
      __component: "droplets.callout",
      content: {
        type: "paragraph",
        children: [{ type: "text", text: "Test content" }],
      },
      color: "bg-red-300",
      type: "info",
      iconEnabled: true,
    };

    const mockUpdateBlock = jest.fn();
    const mockDeleteBlock = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("toggles icon visibility", () => {
      render(
        <CalloutEditor
          block={mockBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={mockDeleteBlock}
        />,
      );

      const toggleButton = screen.getByTestId("update-content-button");
      fireEvent.click(toggleButton);

      expect(mockUpdateBlock).toHaveBeenCalledWith({
        __component: "droplets.callout",
        content: {},
        type: "info",
      });
    });

    describe("Content Updates", () => {
      it("should not show icon toggle for default sky color", () => {
        const skyBlock = {
          ...mockBlock,
          color: "bg-sky-50",
        };

        render(
          <CalloutEditor
            block={skyBlock}
            updateBlock={mockUpdateBlock}
            deleteBlock={mockDeleteBlock}
          />,
        );

        expect(screen.queryByRole("toggleButton")).not.toBeInTheDocument();
      });
    });
  });
});
