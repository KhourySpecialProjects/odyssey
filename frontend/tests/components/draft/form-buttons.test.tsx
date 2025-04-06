import { render, screen } from "@testing-library/react";
import {
  DeleteButton,
  AddButton,
} from "@/components/draft/metadata/form-buttons";

const mockUseFormStatus = jest.fn();

describe("Form Buttons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("DeleteButton", () => {
    it("shows delete text when not pending", () => {
      mockUseFormStatus.mockReturnValue({ pending: false });
      render(<DeleteButton />);
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
  });

  describe("AddButton", () => {
    it("shows corner-down-left icon when not pending", () => {
      mockUseFormStatus.mockReturnValue({ pending: false });
      render(<AddButton />);
      const button = screen.getByRole("button");
      expect(button.querySelector("svg")).toBeInTheDocument();
    });
  });
});
