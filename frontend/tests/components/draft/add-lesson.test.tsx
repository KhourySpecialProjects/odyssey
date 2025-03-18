import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddLesson } from '@/components/draft/add-lesson';
import { addLesson } from '@/lib/actions';
import { useRouter } from 'next/navigation';

jest.mock('@/lib/actions', () => ({
  addLesson: jest.fn()
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

describe('AddLesson', () => {
  const mockDroplet = {
    id: 1,
    name: 'Test Droplet',
    slug: 'test-droplet',
    lessons: []
  };
  const mockOnAddLesson = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders add lesson button', () => {
    render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);
    expect(screen.getByText('Lessons')).toBeInTheDocument();
  });

  it('shows input field when plus icon is clicked', () => {
    render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByPlaceholderText('Lesson Name')).toBeInTheDocument();
  });

  it('handles lesson addition successfully', async () => {
    const mockResponse = {
      data: {
        id: 1,
        attributes: {
          name: 'New Lesson',
          slug: 'new-lesson',
          type: 'general'
        }
      }
    };
    (addLesson as jest.Mock).mockResolvedValue(mockResponse);
    const mockRouter = { push: jest.fn() };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    render(<AddLesson droplet={mockDroplet} onAddLesson={mockOnAddLesson} />);
    
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByPlaceholderText('Lesson Name');
    fireEvent.change(input, { target: { value: 'New Lesson' } });
    fireEvent.submit(input);

    await waitFor(() => {
      expect(mockOnAddLesson).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith('/draft/d/test-droplet/new-lesson');
    });
  });
});