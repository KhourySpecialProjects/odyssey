import { render, screen, fireEvent } from '@testing-library/react';
import { AddLesson } from '@/components/draft/add-lesson';

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
});