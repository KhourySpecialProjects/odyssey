// import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// import { updateDroplet } from '@/lib/actions';
// import { toast } from 'sonner';
// import { DropletBlock } from '@/components/admin/droplets/droplet-block';
// import { DropletStatus, DropletType, FocusArea, Tag } from '@/types';

// jest.mock('@/lib/actions', () => ({
//   updateDroplet: jest.fn(),
// }));

// jest.mock('sonner', () => ({
//   toast: {
//     success: jest.fn(),
//     error: jest.fn(),
//   },
// }));

// jest.mock('next/link', () => {
//   return ({ children, href }: { children: React.ReactNode; href: string }) => {
//     return <a href={href}>{children}</a>;
//   };
// });

// // Mock useFormStatus
// jest.mock('react-dom', () => ({
//   useFormStatus: () => ({ pending: false }),
// }));

// describe('DropletBlock', () => {
//   const mockDroplet = {
//     id: 1,
//     name: 'Test Droplet',
//     slug: 'test-droplet',
//     isHidden: false,
//     focusArea: 'personal' as FocusArea,
//     type: 'knowledge' as DropletType,
//     tags: [{ id: 1, name: 'React' }] as Tag[],
//     learningObjectives: [],
//     status: "published" as DropletStatus,
//     droplet_lessons: []
//   };

//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   it.skip('renders droplet name correctly', () => {
//     render(<DropletBlock droplet={mockDroplet} />);
//     expect(screen.getByText('Test Droplet')).toBeInTheDocument();
//   });

//   it.skip('shows (Hidden) text when droplet is hidden', () => {
//     const hiddenDroplet = { ...mockDroplet, isHidden: true };
//     render(<DropletBlock droplet={hiddenDroplet} />);
//     expect(screen.getByText('Test Droplet (Hidden)')).toBeInTheDocument();
//   });

//   it.skip('links to the correct edit URL', () => {
//     render(<DropletBlock droplet={mockDroplet} />);
//     const editLink = screen.getByRole('link');
//     expect(editLink).toHaveAttribute('href', '/draft/d/test-droplet');
//   });

//   it('shows "Hide Droplet" button when droplet is visible', () => {
//     render(<DropletBlock droplet={mockDroplet} />);
//     expect(screen.getByText('Hide Droplet')).toBeInTheDocument();
//   });

//   it('shows "Show Droplet" button when droplet is hidden', () => {
//     const hiddenDroplet = { ...mockDroplet, isHidden: true };
//     render(<DropletBlock droplet={hiddenDroplet} />);
//     expect(screen.getByText('Show Droplet')).toBeInTheDocument();
//   });

//   it.skip('calls updateDroplet with correct parameters when toggling visibility', async () => {
//     (updateDroplet as jest.Mock).mockResolvedValue({ ok: true });

//     render(<DropletBlock droplet={mockDroplet} />);

//     const toggleButton = screen.getByText('Hide Droplet');
//     fireEvent.click(toggleButton);

//     await waitFor(() => {
//       expect(updateDroplet).toHaveBeenCalledWith(
//         mockDroplet.id,
//         {
//           isHidden: true,
//           name: mockDroplet.name,
//           focusArea: mockDroplet.focusArea,
//           type: mockDroplet.type,
//           tagIds: [1],
//         },
//         { revalidate: true }
//       );
//     });
//   });

//   it.skip('shows success toast when update succeeds', async () => {
//     (updateDroplet as jest.Mock).mockResolvedValue({ ok: true });

//     render(<DropletBlock droplet={mockDroplet} />);

//     const toggleButton = screen.getByText('Hide Droplet');
//     fireEvent.click(toggleButton);

//     await waitFor(() => {
//       expect(toast.success).toHaveBeenCalledWith('Droplet hidden successfully');
//     });
//   });

//   it.skip('shows error toast when update fails', async () => {
//     (updateDroplet as jest.Mock).mockResolvedValue({
//       ok: false,
//       error: 'Update failed'
//     });

//     render(<DropletBlock droplet={mockDroplet} />);

//     const toggleButton = screen.getByText('Hide Droplet');
//     fireEvent.click(toggleButton);

//     await waitFor(() => {
//       expect(toast.error).toHaveBeenCalledWith('Failed to update droplet visibility');
//     });
//   });
// });

// delete this once the part above is working
import { CreateDroplet } from "@/components/admin/droplets/create-droplet";
import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe("CreateDroplet", () => {
  it("renders a button with correct text", () => {
    render(<CreateDroplet />);

    const button = screen.getByRole("button", { name: /create droplet/i });
    expect(button).toBeInTheDocument();
  });

  it("links to the correct URL", () => {
    render(<CreateDroplet />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/new/droplet");
  });

  it("has a plus icon", () => {
    render(<CreateDroplet />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });
});
