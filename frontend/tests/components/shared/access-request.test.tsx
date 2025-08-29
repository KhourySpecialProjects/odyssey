import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AccessRequestBlock } from "@/components/shared/access-manager/access-requests/access-request";
import { deleteAccessRequest } from "@/lib/actions";
import { createAuthorizedUser } from "@/lib/requests/authorized-user";

jest.mock("@/lib/actions", () => ({
  deleteAccessRequest: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  createAuthorizedUser: jest.fn(),
}));

describe("AccessRequestBlock", () => {
  const mockRequest = {
    id: "1",
    givenName: "John",
    familyName: "Doe",
    email: "john@example.com",
    affiliation: "Student",
    college: "Engineering",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders request information", () => {
    render(<AccessRequestBlock request={mockRequest} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("Student • Engineering")).toBeInTheDocument();
  });

  const mockRequest2 = {
    id: "1",
    email: "test@example.com",
    givenName: "John",
    familyName: "Doe",
    affiliation: "Student",
    college: "Test College",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles successful approval flow", async () => {
    (createAuthorizedUser as jest.Mock).mockResolvedValue({ ok: true });
    (deleteAccessRequest as jest.Mock).mockResolvedValue({ ok: true });

    render(<AccessRequestBlock request={mockRequest2} />);

    fireEvent.click(screen.getByText("Accept"));

    await waitFor(() => {
      expect(deleteAccessRequest).toHaveBeenCalled();
      const formData = (deleteAccessRequest as jest.Mock).mock.calls[0][0];
      expect(formData.get("id")).toBe("1");
    });
  });

  it("does not delete request if user creation fails", async () => {
    (createAuthorizedUser as jest.Mock).mockResolvedValue({ ok: false });

    render(<AccessRequestBlock request={mockRequest2} />);

    fireEvent.click(screen.getByText("Accept"));

    await waitFor(() => {
      expect(createAuthorizedUser).toHaveBeenCalled();
    });

    expect(deleteAccessRequest).not.toHaveBeenCalled();
  });
});
