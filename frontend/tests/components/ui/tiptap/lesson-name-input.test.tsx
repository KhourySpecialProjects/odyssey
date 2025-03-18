import { render, screen } from '@testing-library/react'
import { LessonNameInput } from '@/components/ui/tiptap/lesson-name-input'

describe('LessonNameInput', () => {
  const mockProps = {
    initialContent: '<h1>Test Lesson</h1>',
    updateContent: jest.fn(),
    className: 'test-class'
  }

  it('renders editor with initial content', () => {
    render(<LessonNameInput {...mockProps} />)
    expect(screen.getByText('Test Lesson')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<LessonNameInput {...mockProps} />)
    expect(container.firstChild).toHaveClass('test-class')
  })

  it('applies heading styling', () => {
    const { container } = render(<LessonNameInput {...mockProps} />)
    expect(container.querySelector('h1')).toHaveClass(
      'text-4xl',
      'font-extrabold',
      'text-balance'
    )
  })
})