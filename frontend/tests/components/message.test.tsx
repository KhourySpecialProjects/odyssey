import { render, screen } from '@testing-library/react'
import { 
  Message, 
  MessageHeader, 
  MessageDescription, 
  MessageActions 
} from '@/components/message'

describe('Message Components', () => {
  describe('Message', () => {
    it('renders children with default styling', () => {
      const { container } = render(
        <Message>
          <div>Test Content</div>
        </Message>
      )
      
      expect(screen.getByText('Test Content')).toBeInTheDocument()
      expect(container.firstChild).toHaveClass('w-full', 'max-w-5xl')
    })

    it('applies additional classes', () => {
      const { container } = render(
        <Message className="test-class">
          <div>Test Content</div>
        </Message>
      )
      
      expect(container.firstChild).toHaveClass('test-class')
    })
  })

  describe('MessageHeader', () => {
    it('renders title and subtitle', () => {
      render(<MessageHeader title="Test Title" subtitle="Test Subtitle" />)
      
      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument()
    })

    it('applies correct styling', () => {
      render(<MessageHeader title="Test Title" subtitle="Test Subtitle" />)
      
      expect(screen.getByText('Test Subtitle')).toHaveClass('text-sky-600')
      expect(screen.getByText('Test Title')).toHaveClass('text-3xl', 'font-bold')
    })
  })

  describe('MessageDescription', () => {
    it('renders children with correct styling', () => {
      render(<MessageDescription>Test Description</MessageDescription>)
      
      const description = screen.getByText('Test Description')
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass('text-slate-600', 'dark:text-slate-400')
    })
  })

  describe('MessageActions', () => {
    it('renders children with correct layout', () => {
      render(
        <MessageActions>
          <button>Action 1</button>
          <button>Action 2</button>
        </MessageActions>
      )
      
      expect(screen.getByText('Action 1')).toBeInTheDocument()
      expect(screen.getByText('Action 2')).toBeInTheDocument()
      expect(screen.getByRole('div')).toHaveClass('flex', 'flex-col', 'md:flex-row')
    })
  })
})