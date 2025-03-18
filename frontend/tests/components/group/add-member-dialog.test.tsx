import { render, screen, fireEvent } from '@testing-library/react';
import { AddMemberDialog } from '@/components/group/add-member-dialog';

describe('AddMemberDialog', () => {
  const mockOnAddMembers = jest.fn();
  const mockExistingMembers = [{ email: 'existing@example.com' }];

  it('renders add members button', () => {
    render(<AddMemberDialog onAddMembers={mockOnAddMembers} existingMembers={mockExistingMembers} />);
    expect(screen.getByText('Add Members')).toBeInTheDocument();
  });

  it('handles email input', () => {
    render(<AddMemberDialog onAddMembers={mockOnAddMembers} existingMembers={mockExistingMembers} />);
    
    fireEvent.click(screen.getByText('Add Members'));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'test@example.com' }
    });
    
    fireEvent.click(screen.getByText('Add 1 Member'));
    expect(mockOnAddMembers).toHaveBeenCalledWith(['test@example.com']);
  });

  it('shows warning for duplicate emails', () => {
    render(<AddMemberDialog onAddMembers={mockOnAddMembers} existingMembers={mockExistingMembers} />);
    
    fireEvent.click(screen.getByText('Add Members'));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'existing@example.com' }
    });
    
    expect(screen.getByText(/already part of the group/)).toBeInTheDocument();
  });
});