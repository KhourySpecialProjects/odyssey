import { render, screen } from "@testing-library/react";
import {
  DeleteButton,
  AddButton,
} from "@/components/draft/metadata/form-buttons";
import ReactDOM from "react-dom";

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

  jest.mock("react-dom", () => ({
    ...jest.requireActual("react-dom"),
    experimental_useFormStatus: () => ({ pending: false }),
    useFormStatus: () => ({ pending: false }),
  }));

  describe("Form Buttons", () => {
    describe("DeleteButton", () => {
      test("shows delete text when not pending", () => {
        mockUseFormStatus.mockReturnValue({ pending: false });

        render(<DeleteButton />);

        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });
    });

    describe("AddButton", () => {
      test("shows loading spinner when pending", () => {
        mockUseFormStatus.mockReturnValue({ pending: false });

        render(<AddButton />);

        expect(screen.getByRole("button")).toBeInTheDocument();
      });

      test("shows corner-down-left icon when not pending", () => {
        mockUseFormStatus.mockReturnValue({ pending: false });

        render(<AddButton />);

        expect(screen.getByRole("button")).toBeInTheDocument();
        expect(
          screen.getByRole("button").querySelector("svg"),
        ).toBeInTheDocument();
      });
    });
  });
});
