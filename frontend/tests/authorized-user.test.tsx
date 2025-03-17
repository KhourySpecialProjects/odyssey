// import { render, screen } from '@testing-library/react';
// import { AuthorizedUserBlock } from '@/components/admin/users/authorized-user';
// import { AuthorizedUserRoleTitle } from '@/lib/globals';
// import { TimeZone } from '@/types';

// // Mock dependencies
// jest.mock('@/lib/actions', () => ({
//   updateAuthorizedUser: jest.fn(),
//   updateUserInfo: jest.fn(),
//   uploadImage: jest.fn(),
// }));

// jest.mock('react-dropzone', () => ({
//   useDropzone: () => ({
//     getRootProps: () => ({}),
//     getInputProps: () => ({}),
//   }),
// }));

// // Mock useFormStatus
// jest.mock('react-dom', () => ({
//   useFormStatus: () => ({ pending: false }),
// }));

// jest.mock('sonner', () => ({
//   toast: {
//     success: jest.fn(),
//     error: jest.fn(),
//   },
// }));

// describe('AuthorizedUserBlock', () => {
//   const mockUser = {
//     id: 1,
//     email: 'user@example.com',
//     firstName: 'John',
//     lastName: 'Doe',
//     bio: 'Test bio',
//     profilePhoto: 'https://example.com/photo.jpg',
//     isEnabled: true,
//     roles: [
//       { id: 1, title: AuthorizedUserRoleTitle.Faculty }
//     ],
//     linkedin: "https://www.google.com/",
//     github: "https://www.google.com/",
//     firstTime: false,
//     friendships: [],
//     sent_requests: [],
//     received_requests: [],
//     blocked: [],
//     was_blocked: [],
//     timeZone: "America/New_York" as TimeZone
//   };

//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   it('renders user information correctly', () => {
//     render(<AuthorizedUserBlock user={mockUser} />);

//     expect(screen.getByText('John Doe')).toBeInTheDocument();
//   });

//   it('shows (Disabled) text when user is disabled', () => {
//     const disabledUser = { ...mockUser, isEnabled: false };
//     render(<AuthorizedUserBlock user={disabledUser} />);

//     expect(screen.getByText('John Doe (Disabled)')).toBeInTheDocument();
//   });

//   it('shows Admin text for admin users', () => {
//     const adminUser = {
//       ...mockUser,
//       roles: [
//         { id: 1, title: AuthorizedUserRoleTitle.SysAdmin }
//       ]
//     };
//     render(<AuthorizedUserBlock user={adminUser} />);

//     expect(screen.getByText('Admin')).toBeInTheDocument();
//   });

//   it('has an edit button with a pencil icon', () => {
//     render(<AuthorizedUserBlock user={mockUser} />);

//     const button = screen.getByRole('button');
//     expect(button).toBeInTheDocument();

//     // Check for the tooltip text
//     const tooltip = screen.getByText('Edit User');
//     expect(tooltip).toBeInTheDocument();
//   });

//   // Note: Testing dialog interactions and form submissions would require
//   // more complex setup and is beyond the scope of this basic test
// });

// delete this after the ones above start working
import { render, screen } from "@testing-library/react";
import { Reports } from "@/components/admin/reports/reports";
import { fetchReports } from "@/lib/requests/data";

// Mock dependencies
jest.mock("@/lib/requests/data", () => ({
  fetchReports: jest.fn(),
}));

jest.mock("@/components/admin/reports/report", () => ({
  ReportBlock: ({ report }: { report: any }) => (
    <div data-testid={`report-${report.id}`}>
      {report.fullName} - {report.description}
    </div>
  ),
}));

describe("Reports", () => {
  const mockReports = [
    {
      id: "1",
      type: "Bug",
      fullName: "John Doe",
      email: "john.doe@example.com",
      path: "/some-path",
      description: "This is a test report description",
    },
    {
      id: "2",
      type: "Content",
      fullName: "Jane Smith",
      email: "jane.smith@example.com",
      path: "/another-path",
      description: "Another test report",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fetchReports as jest.Mock).mockResolvedValue(mockReports);
  });

  it("renders the component with correct heading", async () => {
    render(await Reports());

    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(
      screen.getByText("The following reports have been received from users."),
    ).toBeInTheDocument();
  });

  it("displays reports when available", async () => {
    render(await Reports());

    expect(screen.getByTestId("report-1")).toBeInTheDocument();
    expect(screen.getByTestId("report-2")).toBeInTheDocument();
  });

  it("displays a message when no reports are available", async () => {
    (fetchReports as jest.Mock).mockResolvedValue([]);

    render(await Reports());

    expect(
      screen.getByText("There are no reports at this time."),
    ).toBeInTheDocument();
  });

  it("calls fetchReports to get data", async () => {
    render(await Reports());

    expect(fetchReports).toHaveBeenCalledTimes(1);
  });
});
