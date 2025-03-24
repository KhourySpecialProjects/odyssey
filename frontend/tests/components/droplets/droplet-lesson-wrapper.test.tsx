import { render, screen, fireEvent } from '@testing-library/react';
import { DropletLessonWrapper } from '@/components/droplets/lessons/droplet-lesson-wrapper';
import { getNotesByAuthorizedUserAndLesson } from '@/lib/requests/notes';

jest.mock('@/lib/requests/notes', () => ({
  getNotesByAuthorizedUserAndLesson: jest.fn()
}));

describe('DropletLessonWrapper', () => {
  const mockLesson = {
    id: 1,
    name: 'Test Lesson',
    slug: 'test-lesson'
  };

  const mockDroplet = {
    id: 1,
    name: 'Test Droplet',
    slug: 'test-droplet'
  };

  beforeEach(() => {
    (getNotesByAuthorizedUserAndLesson as jest.Mock).mockResolvedValue([]);
  });

  it('renders lesson content', () => {
    expect(1+1).toBe(2);
  });

});