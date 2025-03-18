import { render, screen, fireEvent } from '@testing-library/react';
import { ContentTypeSelector } from '@/components/explore/content-type-selector';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

describe('ContentTypeSelector', () => {
  const mockRouter = { push: jest.fn() };
  const mockSearchParams = new URLSearchParams();
  
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (usePathname as jest.Mock).mockReturnValue('/explore');
  });

  it('renders both content type buttons', () => {
    render(<ContentTypeSelector />);
    expect(screen.getByText('Droplets')).toBeInTheDocument();
    expect(screen.getByText('Playlists')).toBeInTheDocument();
  });

  it('updates URL when clicking content type', () => {
    render(<ContentTypeSelector />);
    fireEvent.click(screen.getByText('Playlists'));
    expect(mockRouter.push).toHaveBeenCalledWith('/explore?contentType=playlists');
  });
});