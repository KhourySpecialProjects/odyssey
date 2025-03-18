import { LearningObjectiveDisplay } from '@/components/draft/metadata/learning-objectives/learning-objective';
import { render, fireEvent, screen } from '@testing-library/react';

describe('LearningObjectiveDisplay', () => {
  const mockUpdate = jest.fn();
  const mockRemove = jest.fn();
  const defaultProps = {
    objective: 'Test Objective',
    update: mockUpdate,
    remove: mockRemove,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render objective text when not in edit mode', () => {
    render(<LearningObjectiveDisplay {...defaultProps} />);
    expect(screen.getByText('Test Objective')).toBeInTheDocument();
  });

  it('should switch to edit mode on click', () => {
    render(<LearningObjectiveDisplay {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Test Objective'));
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Test Objective');
  });

  it('should call update when editing objective', () => {
    render(<LearningObjectiveDisplay {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Test Objective'));
    const input = screen.getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'Updated Objective' } });
    
    expect(mockUpdate).toHaveBeenCalledWith('Updated Objective');
  });

  it('should call remove when delete button is clicked', () => {
    render(<LearningObjectiveDisplay {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Test Objective'));
    fireEvent.click(screen.getByRole('button'));
    
    expect(mockRemove).toHaveBeenCalled();
  });
});
