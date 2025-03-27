import { render, screen, fireEvent } from "@testing-library/react";
import { AddMemberDialog } from "@/components/group/add-member-dialog";
import userEvent from "@testing-library/user-event";

describe("AddMemberDialog", () => {
  const mockOnAddMembers = jest.fn();
  const mockExistingMembers = [{ email: "existing@example.com" }];

  it("renders add members button", () => {
    render(
      <AddMemberDialog
        onAddMembers={mockOnAddMembers}
        existingMembers={mockExistingMembers}
      />,
    );
    expect(screen.getByText("Add Members")).toBeInTheDocument();
  });

  it("handles email input", () => {
    render(
      <AddMemberDialog
        onAddMembers={mockOnAddMembers}
        existingMembers={mockExistingMembers}
      />,
    );

    fireEvent.click(screen.getByText("Add Members"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "test@example.com" },
    });

    fireEvent.click(screen.getByText("Add 1 Member"));
    expect(mockOnAddMembers).toHaveBeenCalledWith(["test@example.com"]);
  });

  it("shows warning for duplicate emails", () => {
    render(
      <AddMemberDialog
        onAddMembers={mockOnAddMembers}
        existingMembers={mockExistingMembers}
      />,
    );

    fireEvent.click(screen.getByText("Add Members"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "existing@example.com" },
    });

    expect(screen.getByText(/already part of the group/)).toBeInTheDocument();
  });

  describe("AddMemberDialog", () => {
    it("handles duplicate email removal correctly", async () => {
      const mockOnAddMembers = jest.fn();
      const existingMembers = [{ email: "existing@example.com" }];

      render(
        <AddMemberDialog
          onAddMembers={mockOnAddMembers}
          existingMembers={existingMembers}
        />,
      );

      await userEvent.click(screen.getByText("Add Members"));

      const textarea = screen.getByPlaceholderText(
        "john@example.com, jane@example.com",
      );
      await userEvent.type(
        textarea,
        "new@example.com, existing@example.com, another@example.com",
      );

      const removeButton = screen.getByText("Remove All Duplicates");
      await userEvent.click(removeButton);

      expect(textarea).toHaveValue("new@example.com, another@example.com");

      const addButton = screen.getByText("Add 2 Members");
      expect(addButton).toBeEnabled();
    });
  });

  describe("AddMemberDialog", () => {
    it("displays correct pluralization in add button text", async () => {
      const mockOnAddMembers = jest.fn();
      const existingMembers = [{ email: "existing@example.com" }];

      render(
        <AddMemberDialog
          onAddMembers={mockOnAddMembers}
          existingMembers={existingMembers}
        />,
      );

      await userEvent.click(screen.getByText("Add Members"));

      const textarea = screen.getByPlaceholderText(
        "john@example.com, jane@example.com",
      );
      await userEvent.type(textarea, "new@example.com");
      expect(
        screen.getByRole("button", { name: "Add 1 Member" }),
      ).toBeInTheDocument();

      await userEvent.clear(textarea);
      await userEvent.type(textarea, "new1@example.com, new2@example.com");
      expect(
        screen.getByRole("button", { name: "Add 2 Members" }),
      ).toBeInTheDocument();
    });
  });
});
