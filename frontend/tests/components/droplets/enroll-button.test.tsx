import { render, screen, fireEvent } from '@testing-library/react';
import { EnrollButton } from '@/components/droplets/enroll-button';
import { createEnrollment, deleteEnrollment } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

jest.mock('@/lib/actions', () => ({
  createEnrollment: jest.fn(),
  deleteEnrollment: jest.fn()
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), promise: jest.fn() }
}));

describe('EnrollButton', () => {
  const mockDroplet = {
    id: 1,
    name: 'Test Droplet',
    slug: 'test-droplet',
    lessons: [{ slug: 'lesson-1' }]
  };

  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  it('handles enrollment', async () => {
    (createEnrollment as jest.Mock).mockResolvedValue({ ok: true });

    render(<EnrollButton droplet={mockDroplet as any} />);
    await fireEvent.click(screen.getByRole('button'));
    expect(createEnrollment).toHaveBeenCalledWith(mockDroplet, []);
    expect(toast.success).toHaveBeenCalled();
    
    expect(mockRouter.push).toHaveBeenCalledWith('/d/test-droplet/lesson-1');
  });

  it('handles unenrollment', async () => {
    render(<EnrollButton droplet={mockDroplet as any} isEnrolled={true} />);
    fireEvent.click(screen.getByText('Unenroll'));

    expect(deleteEnrollment).toHaveBeenCalled();
    expect(toast.promise).toHaveBeenCalled();
  });
});