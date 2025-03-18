import { render, screen, fireEvent } from '@testing-library/react';
import { RegenerateSlugButton } from '@/components/draft/metadata/regenerate-slug';
import { updateDroplet } from '@/lib/actions';
import { useRouter } from 'next/navigation';

jest.mock('@/lib/actions', () => ({
  updateDroplet: jest.fn()
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

describe('RegenerateSlugButton', () => {
  const mockRouter = { replace: jest.fn() };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  it('renders button with correct text', () => {
    render(<RegenerateSlugButton name="Test Droplet" dropletId={1} />);
    expect(screen.getByText('Regenerate Slug')).toBeInTheDocument();
  });

  it('calls updateDroplet with correct parameters when clicked', async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({
      ok: true,
      data: { attributes: { slug: 'new-slug' } }
    });

    render(<RegenerateSlugButton name="Test Droplet" dropletId={1} />);
    fireEvent.click(screen.getByText('Regenerate Slug'));

    expect(updateDroplet).toHaveBeenCalledWith(
      1,
      { name: 'Test Droplet' },
      { regenerateSlug: true }
    );
  });

  it('redirects to new slug path on successful update', async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({
      ok: true,
      data: { attributes: { slug: 'new-slug' } }
    });

    render(<RegenerateSlugButton name="Test Droplet" dropletId={1} />);
    fireEvent.click(screen.getByText('Regenerate Slug'));

    await screen.findByText('Regenerate Slug');
    expect(mockRouter.replace).toHaveBeenCalledWith('/draft/d/new-slug');
  });
});