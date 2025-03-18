import { render, screen, fireEvent } from '@testing-library/react';
import { AdminSelector } from '@/components/shared/selector';

describe('AdminSelector', () => {
  const mockContent = {
    'Tab 1': <div>Content 1</div>,
    'Tab 2': <div>Content 2</div>,
  };

  it('renders all tabs', () => {
    render(<AdminSelector content={mockContent} />);
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
  });

  it('shows first tab content by default', () => {
    render(<AdminSelector content={mockContent} />);
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('switches content when tab is clicked', () => {
    render(<AdminSelector content={mockContent} />);
    
    fireEvent.click(screen.getByText('Tab 2'));
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('applies correct styling to selected tab', () => {
    render(<AdminSelector content={mockContent} />);
    expect(screen.getByText('Tab 1')).toHaveClass('bg-slate-200');
  });
});