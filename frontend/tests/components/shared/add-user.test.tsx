import { render, screen, fireEvent } from '@testing-library/react';
import { AddUser } from '@/components/shared/access-manager/add-user/add-user';

describe('AddUser', () => {
  it('renders form elements', () => {
    render(<AddUser />);
    expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument();
    expect(screen.getByText('Send Invite')).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    render(<AddUser />);
    
    const input = screen.getByPlaceholderText('Enter email address');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.submit(screen.getByRole('form'));
    
    expect(input).toHaveValue('');
  });

  it('requires email input', () => {
    render(<AddUser />);
    const input = screen.getByPlaceholderText('Enter email address');
    expect(input).toHaveAttribute('required');
  });
});