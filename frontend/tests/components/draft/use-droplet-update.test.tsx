import { renderHook, act } from '@testing-library/react';
import { updateDroplet } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { useDropletUpdate } from '@/components/draft/metadata/hooks/useDropletUpdate';

// Mock dependencies
jest.mock('@/lib/actions');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('useDropletUpdate', () => {
  const mockRouter = {
    replace: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('should handle successful update', async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({
      error: null,
      data: { attributes: { slug: 'new-slug' } },
    });

    const { result } = renderHook(() => useDropletUpdate(1));

    await act(async () => {
      result.current.handleChange({ name: 'New Name' });
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(updateDroplet).toHaveBeenCalledWith(1, { name: 'New Name' });
    expect(mockRouter.replace).toHaveBeenCalledWith('/draft/d/new-slug');
    expect(result.current.error).toBe('');
  });
});
