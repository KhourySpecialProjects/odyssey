import { render, screen, fireEvent } from '@testing-library/react';
import { NextSteps } from '@/components/draft/metadata/next-steps/next-steps';
import { updateDroplet } from '@/lib/actions';
import { toast } from 'sonner';

jest.mock('@/lib/actions', () => ({
  updateDroplet: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn() }
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    replace: jest.fn(),
  })
}));

// Mock the useDropletUpdate hook
jest.mock('@/components/draft/metadata/hooks/useDropletUpdate', () => ({
  useDropletUpdate: () => ({
    update: jest.fn(),
    error: null
  })
}));

describe('NextSteps', () => {
  const mockNextSteps = [
    { id: 1, label: 'Step 1', url: 'https://test1.com' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders next steps list', () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
    expect(screen.getByText('Next Steps')).toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });

  it('handles adding new next step', async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({
      data: true,
      error: null
    });

    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
    
    fireEvent.change(screen.getByPlaceholderText('URL'), {
      target: { value: 'https://test2.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('Label'), {
      target: { value: 'Step 2' }
    });
    fireEvent.submit(screen.getByRole('form'));

    expect(updateDroplet).toHaveBeenCalledWith(1, {
      nextSteps: [
        { label: 'Step 1', url: 'https://test1.com' },
        { label: 'Step 2', url: 'https://test2.com' }
      ]
    });
  });

  it('shows error toast for invalid URL', async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({
      data: null,
      error: 'Invalid URL'
    });

    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
    
    fireEvent.change(screen.getByPlaceholderText('URL'), {
      target: { value: 'invalid-url' }
    });
    fireEvent.change(screen.getByPlaceholderText('Label'), {
      target: { value: 'Step 2' }
    });
    await fireEvent.submit(screen.getByRole('form'));

    expect(toast.error).toHaveBeenCalledWith('Not a valid URL');
  });
});