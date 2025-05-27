import { render, screen, fireEvent } from "@testing-library/react";
import CalloutTypeTool from "@/components/ui/tiptap/toolbar/tools/callout-type-tool";

describe("CalloutTypeTool", () => {
  const mockBlock = {
    content: [
      {
        type: "code" as "code",
        content: [
          {
            type: "code" as "code",
            text: "Test content",
          },
        ],
        language: "text",
        children: [],
      },
    ],
    type: "info" as "info",
    color: "bg-sky-50",
    __component: "droplets.callout" as "droplets.callout",
  };
  const mockUpdateBlock = jest.fn();

  it("renders menu button", () => {
    render(<CalloutTypeTool block={mockBlock} updateBlock={mockUpdateBlock} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("opens popover on click", () => {
    render(<CalloutTypeTool block={mockBlock} updateBlock={mockUpdateBlock} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Warning")).toBeInTheDocument();
  });

  it("updates block type when option is selected", () => {
    render(<CalloutTypeTool block={mockBlock} updateBlock={mockUpdateBlock} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Warning"));

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.callout",
      content: mockBlock.content,
      type: "info",
      color: "bg-red-300",
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const calloutTypes = [
    { name: "Warning", color: "bg-red-300" },
    { name: "Question", color: "bg-blue-300" },
    { name: "Important", color: "bg-orange-300" },
    { name: "Definition", color: "bg-green-300" },
    { name: "More Information", color: "bg-purple-300" },
    { name: "Caution", color: "bg-amber-300" },
    { name: "Default", color: "bg-sky-50 dark:bg-sky-200" },
  ];

  it.each(calloutTypes)(
    "updates block with $name type",
    async ({ name, color }) => {
      render(
        <CalloutTypeTool block={mockBlock} updateBlock={mockUpdateBlock} />,
      );

      fireEvent.click(screen.getByRole("button"));

      fireEvent.click(screen.getByText(name));

      expect(mockUpdateBlock).toHaveBeenCalledWith({
        __component: "droplets.callout",
        content: mockBlock.content,
        type: "info",
        color,
      });
    },
  );

  it("closes popover after selection", () => {
    render(<CalloutTypeTool block={mockBlock} updateBlock={mockUpdateBlock} />);

    fireEvent.click(screen.getByRole("button"));

    fireEvent.click(screen.getByText("Warning"));

    expect(screen.queryByText("Warning")).not.toBeInTheDocument();
  });
});
