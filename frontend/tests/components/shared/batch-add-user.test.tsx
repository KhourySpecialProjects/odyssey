import { render, screen, fireEvent, act } from "@testing-library/react";
import { BatchAddUser } from "@/components/shared/access-manager/add-user/batch-add-user";
import { createBatchAuthorizedUsers } from "@/lib/actions";

jest.mock("@/lib/actions", () => ({
  createBatchAuthorizedUsers: jest.fn(),
}));

describe("BatchAddUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders form elements", () => {
    render(<BatchAddUser />);
    expect(
      screen.getByPlaceholderText(/Enter email addresses/),
    ).toBeInTheDocument();
    expect(screen.getByText("Choose Files")).toBeInTheDocument();
  });

  it("handles text input submission", async () => {
    (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({
      ok: true,
      data: { successful: [], failed: [] },
    });

    render(<BatchAddUser />);

    const textarea = screen.getByPlaceholderText(/Enter email addresses/);
    fireEvent.change(textarea, { target: { value: "test@example.com" } });
    fireEvent.submit(screen.getByRole("form"));

    expect(createBatchAuthorizedUsers).toHaveBeenCalledWith([
      "test@example.com",
    ]);
  });

  it("handles file upload", async () => {
    render(<BatchAddUser />);

    const file = new File(["test@example.com"], "test.csv", {
      type: "text/csv",
    });
    const input = screen.getByLabelText("Choose Files");

    Object.defineProperty(input, "files", {
      value: [file],
    });

    fireEvent.change(input);
    expect(screen.getByText("1 file(s) selected")).toBeInTheDocument();
  });
});

describe("BatchAddUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("removes file when clicking remove button", () => {
    render(<BatchAddUser />);

    const file = new File(["email1@test.com"], "test.csv", {
      type: "text/csv",
    });
    const input = screen.getByLabelText(/Choose Files/i);
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("test.csv")).toBeInTheDocument();

    const removeButton = screen.getByRole("button", { name: "" });
    fireEvent.click(removeButton);

    expect(screen.queryByText("test.csv")).not.toBeInTheDocument();
  });

  test("handles drag and drop of CSV files", () => {
    render(<BatchAddUser />);

    const dropZone = screen.getByText(
      /Drag and drop CSV files here/i,
    ).parentElement!;

    const file = new File(["email@test.com"], "test.csv", { type: "text/csv" });

    const dropEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      dataTransfer: {
        files: [file],
      },
    };

    fireEvent.drop(dropZone, dropEvent);

    expect(screen.getByText("test.csv")).toBeInTheDocument();
  });

  describe("BatchAddUser", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("processes CSV file content correctly", async () => {
      const mockFileContent = "email1@test.com\nemail2@test.com";
      const mockFile = new File([mockFileContent], "test.csv", {
        type: "text/csv",
      });
      Object.defineProperty(mockFile, "text", {
        value: async () => mockFileContent,
      });

      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({
        ok: true,
        data: { successful: ["email1@test.com"], failed: [] },
        message: "Success",
      });

      render(<BatchAddUser />);

      const input = screen.getByLabelText(/Choose Files/i);
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      const form = screen.getByRole("form");
      await act(async () => {
        await fireEvent.submit(form);
      });
      expect(createBatchAuthorizedUsers).toHaveBeenCalledWith([
        "email1@test.com",
        "email2@test.com",
      ]);
    });

    it("handles form submission with textarea input", async () => {
      const mockEmails = "test1@example.com, test2@example.com";

      render(<BatchAddUser />);

      const textarea = screen.getByPlaceholderText(/Enter email addresses/);
      fireEvent.change(textarea, { target: { value: mockEmails } });

      const form = screen.getByRole("form");
      await act(async () => {
        fireEvent.submit(form);
      });

      expect(createBatchAuthorizedUsers).toHaveBeenCalledWith([
        "test1@example.com",
        "test2@example.com",
      ]);
    });

    it("displays file selection count", () => {
      render(<BatchAddUser />);

      const mockFiles = [
        new File([""], "test1.csv", { type: "text/csv" }),
        new File([""], "test2.csv", { type: "text/csv" }),
      ];

      const input = screen.getByLabelText("Choose Files");
      fireEvent.change(input, { target: { files: mockFiles } });

      expect(screen.getByText("2 file(s) selected")).toBeInTheDocument();
    });
  });
});
