import { render, screen, fireEvent } from '@testing-library/react';
import { LearningObjectivesInput } from '@/components/new/learning-objectives-input';

describe('LearningObjectivesInput', () => {
  const mockSetLearningObjectives = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders learning objectives inputs', () => {
    render(
      <LearningObjectivesInput
        learningObjectives={['Objective 1']}
        setLearningObjectives={mockSetLearningObjectives}
      />
    );
    expect(screen.getByDisplayValue('Objective 1')).toBeInTheDocument();
  });

  it('adds new objective when + button clicked', () => {
    render(
      <LearningObjectivesInput
        learningObjectives={[]}
        setLearningObjectives={mockSetLearningObjectives}
      />
    );
    fireEvent.click(screen.getByText('+'));
    expect(mockSetLearningObjectives).toHaveBeenCalledWith(['']);
  });

  it('removes objective when trash icon clicked', () => {
    render(
      <LearningObjectivesInput
        learningObjectives={['Objective 1']}
        setLearningObjectives={mockSetLearningObjectives}
      />
    );
    fireEvent.click(screen.getByRole('delete'));
    expect(mockSetLearningObjectives).toHaveBeenCalledWith([]);
  });

describe('LearningObjectivesInput', () => {
  test('handles input changes and Enter key correctly', () => {
    const mockLearningObjectives = ['First objective'];
    const setLearningObjectives = jest.fn();

    render(
      <LearningObjectivesInput
        learningObjectives={mockLearningObjectives}
        setLearningObjectives={setLearningObjectives}
      />
    );

    const input = screen.getByDisplayValue('First objective');
    
    fireEvent.change(input, { target: { value: 'Updated objective' } });
    expect(setLearningObjectives).toHaveBeenCalledWith(['Updated objective']);

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(setLearningObjectives).toHaveBeenCalledWith([
      'First objective',
      ''
    ]);
  });

  test('does not add empty objective if one already exists', () => {
    const mockLearningObjectives = ['First objective', ''];
    const setLearningObjectives = jest.fn();

    render(
      <LearningObjectivesInput
        learningObjectives={mockLearningObjectives}
        setLearningObjectives={setLearningObjectives}
      />
    );

    const input = screen.getByDisplayValue('First objective');
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(setLearningObjectives).not.toHaveBeenCalled();
  });
});
});