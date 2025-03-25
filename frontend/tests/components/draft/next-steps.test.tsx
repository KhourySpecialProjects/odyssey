import { render, screen, fireEvent } from '@testing-library/react';
import { NextSteps } from '@/components/draft/metadata/next-steps/next-steps';
import { updateDroplet } from '@/lib/actions';

jest.mock('@/lib/actions', () => ({
  updateDroplet: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn()
  }
}));

jest.mock('@/components/draft/metadata/hooks/useDropletUpdate', () => ({
  useDropletUpdate: () => ({
    error: null,
    handleChange: jest.fn()
  })
}));

describe('NextSteps', () => {
  const mockNextSteps = [
    { id: 1, label: 'Step 1', url: 'http://example.com/1' },
    { id: 2, label: 'Step 2', url: 'http://example.com/2' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders next steps list', () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
  });

  it('prevents submission with empty fields', async () => {
    render(<NextSteps dropletId={1} nextSteps={mockNextSteps} />);
    
    const form = screen.getByRole('form');
    await fireEvent.submit(form);

    expect(updateDroplet).not.toHaveBeenCalled();
  });
});