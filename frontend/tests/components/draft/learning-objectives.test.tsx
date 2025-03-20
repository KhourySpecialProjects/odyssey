import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { updateDroplet } from '@/lib/actions';
import { LearningObjectives } from '@/components/draft/metadata/learning-objectives/learning-objectives';

jest.mock('@/lib/actions');

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

describe('LearningObjectives', () => {
  const mockLearningObjectives = [
    { id: 1, objective: 'First Objective' },
    { id: 2, objective: 'Second Objective' },
  ];

  const defaultProps = {
    dropletId: 1,
    learningObjectives: mockLearningObjectives,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all learning objectives', () => {
    render(<LearningObjectives {...defaultProps} />);
    
    expect(screen.getByText('First Objective')).toBeInTheDocument();
    expect(screen.getByText('Second Objective')).toBeInTheDocument();
  });

  it('should handle adding new objective', async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({
      error: null,
      data: { id: 3 },
    });

    render(<LearningObjectives {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('New Learning Objective...');
    fireEvent.change(input, { target: { value: 'New Objective' } });
    
    const form = input.closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(updateDroplet).toHaveBeenCalledWith(1, {
        learningObjectives: [
          'First Objective',
          'Second Objective',
          'New Objective',
        ],
      });
    });
  });

  it('should handle updating objective', async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({
      error: null,
      data: { id: 1 },
    });

    render(<LearningObjectives {...defaultProps} />);
    
    fireEvent.click(screen.getByText('First Objective'));
    const input = screen.getByDisplayValue('First Objective');
    
    fireEvent.change(input, { target: { value: 'Updated Objective' } });

    await waitFor(() => {
      expect(updateDroplet).toHaveBeenCalledWith(1, {
        learningObjectives: ['Updated Objective', 'Second Objective'],
      });
    });
  });

  it('should handle removing objective', async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({
      error: null,
      data: { id: 1 },
    });

    render(<LearningObjectives {...defaultProps} />);
    
    fireEvent.click(screen.getByText('First Objective'));
    const deleteButton = screen.getByRole('button');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(updateDroplet).toHaveBeenCalledWith(1, {
        learningObjectives: ['Second Objective'],
      });
    });
  });
});
