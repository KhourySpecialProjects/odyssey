import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreateDropletForm } from '@/components/new/new-droplet-form';
import { useRouter } from 'next/navigation';
import { createDroplet } from '@/lib/actions';
import userEvent from '@testing-library/user-event';

jest.mock('@/lib/actions', () => ({
  createDroplet: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

describe('CreateDropletForm', () => {
  const mockTags = [{ id: 1, name: 'React', droplets: [], slug: "slug" }];
  const mockAuthor = { name: 'Test Author', email: 'test@example.com', roles: [], isActive: true };

  const mockRouter = {
    push: jest.fn(),
    back: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form fields', () => {
    render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);
    expect(screen.getByPlaceholderText('Developing a Droplet')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Learning Objectives')).toBeInTheDocument();
  });

  test('displays author information correctly', () => {
    render(<CreateDropletForm tags={mockTags} author={mockAuthor} />);
    
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });
});