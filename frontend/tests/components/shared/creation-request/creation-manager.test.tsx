import { render, screen } from "@testing-library/react";
import { CreationRequestManager } from "@/components/shared/creation-request-manager/creation-manager";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { User } from "@/types";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

// Mock the utility function
jest.mock("@/lib/utils", () => ({
  isAuthorizedUserAdmin: jest.fn(),
}));

// Mock the CreationRequests component
jest.mock(
  "@/components/shared/creation-request-manager/creation-requests",
  () => ({
    CreationRequests: jest.fn(() => (
      <div data-testid="creation-requests">Creation Requests Component</div>
    )),
  }),
);

const {
  CreationRequests,
} = require("@/components/shared/creation-request-manager/creation-requests");

describe("CreationRequestManager", () => {
  const mockAdminUser: User = {
    name: "Admin User",
    email: "admin@example.com",
    image: null,
    nuid: "001234567",
    roles: [AuthorizedUserRoleTitle.SysAdmin],
    isActive: true,
  };

  const mockNonAdminUser: User = {
    name: "Regular User",
    email: "user@example.com",
    image: null,
    nuid: "007654321",
    roles: [AuthorizedUserRoleTitle.User],
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders CreationRequests component when user is admin", async () => {
    (isAuthorizedUserAdmin as jest.Mock).mockReturnValue(true);

    render(await CreationRequestManager({ user: mockAdminUser }));

    expect(isAuthorizedUserAdmin).toHaveBeenCalledWith(mockAdminUser.roles);
    expect(screen.getByTestId("creation-requests")).toBeInTheDocument();
    expect(CreationRequests).toHaveBeenCalled();
  });

  it("does not render CreationRequests component when user is not admin", async () => {
    (isAuthorizedUserAdmin as jest.Mock).mockReturnValue(false);

    render(await CreationRequestManager({ user: mockNonAdminUser }));

    expect(isAuthorizedUserAdmin).toHaveBeenCalledWith(mockNonAdminUser.roles);
    expect(screen.queryByTestId("creation-requests")).not.toBeInTheDocument();
    expect(CreationRequests).not.toHaveBeenCalled();
  });

  it("does not render any content when user is not admin", async () => {
    (isAuthorizedUserAdmin as jest.Mock).mockReturnValue(false);

    render(await CreationRequestManager({ user: mockNonAdminUser }));

    // Should not render the CreationRequests component
    expect(screen.queryByTestId("creation-requests")).not.toBeInTheDocument();
    expect(CreationRequests).not.toHaveBeenCalled();
  });

  it("correctly identifies admin user with admin role", async () => {
    (isAuthorizedUserAdmin as jest.Mock).mockReturnValue(true);

    render(await CreationRequestManager({ user: mockAdminUser }));

    expect(isAuthorizedUserAdmin).toHaveBeenCalledTimes(1);
    expect(isAuthorizedUserAdmin).toHaveBeenCalledWith([
      AuthorizedUserRoleTitle.SysAdmin,
    ]);
  });

  it("handles user with multiple roles including admin", async () => {
    const multiRoleUser: User = {
      name: "Multi Role User",
      email: "multi@example.com",
      image: null,
      nuid: "003456789",
      roles: [AuthorizedUserRoleTitle.SysAdmin, AuthorizedUserRoleTitle.User],
      isActive: true,
    };

    (isAuthorizedUserAdmin as jest.Mock).mockReturnValue(true);

    render(await CreationRequestManager({ user: multiRoleUser }));

    expect(isAuthorizedUserAdmin).toHaveBeenCalledWith(multiRoleUser.roles);
    expect(screen.getByTestId("creation-requests")).toBeInTheDocument();
  });

  it("handles user with empty roles array", async () => {
    const noRoleUser: User = {
      name: "No Role User",
      email: "norole@example.com",
      image: null,
      nuid: "009876543",
      roles: [],
      isActive: true,
    };

    (isAuthorizedUserAdmin as jest.Mock).mockReturnValue(false);

    render(await CreationRequestManager({ user: noRoleUser }));

    expect(isAuthorizedUserAdmin).toHaveBeenCalledWith([]);
    expect(screen.queryByTestId("creation-requests")).not.toBeInTheDocument();
  });

  it("handles inactive user with admin role", async () => {
    const inactiveAdminUser: User = {
      name: "Inactive Admin",
      email: "inactive@example.com",
      image: null,
      nuid: "005555555",
      roles: [AuthorizedUserRoleTitle.SysAdmin],
      isActive: false,
    };

    (isAuthorizedUserAdmin as jest.Mock).mockReturnValue(true);

    render(await CreationRequestManager({ user: inactiveAdminUser }));

    expect(isAuthorizedUserAdmin).toHaveBeenCalledWith(inactiveAdminUser.roles);
    expect(screen.getByTestId("creation-requests")).toBeInTheDocument();
  });

  it("handles user with null name and email", async () => {
    const anonymousUser: User = {
      name: null,
      email: null,
      image: null,
      nuid: "001111111",
      roles: [AuthorizedUserRoleTitle.User],
      isActive: true,
    };

    (isAuthorizedUserAdmin as jest.Mock).mockReturnValue(false);

    render(await CreationRequestManager({ user: anonymousUser }));

    expect(isAuthorizedUserAdmin).toHaveBeenCalledWith(anonymousUser.roles);
    expect(screen.queryByTestId("creation-requests")).not.toBeInTheDocument();
  });
});
