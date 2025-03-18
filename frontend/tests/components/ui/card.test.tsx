import { render } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'

describe('Card', () => {
  it('renders full card with all components', () => {
    const { getByText } = render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Test Content</CardContent>
        <CardFooter>Test Footer</CardFooter>
      </Card>
    )

    expect(getByText('Test Title')).toBeInTheDocument()
    expect(getByText('Test Description')).toBeInTheDocument()
    expect(getByText('Test Content')).toBeInTheDocument()
    expect(getByText('Test Footer')).toBeInTheDocument()
  })

  it('applies correct styling to card', () => {
    const { container } = render(<Card>Content</Card>)
    expect(container.firstChild).toHaveClass('rounded-lg', 'border', 'bg-white')
  })

  it('applies custom className to components', () => {
    const { container } = render(
      <Card className="test-class">
        <CardHeader className="header-class">Header</CardHeader>
      </Card>
    )
    expect(container.firstChild).toHaveClass('test-class')
    expect(container.querySelector('.header-class')).toBeInTheDocument()
  })
})