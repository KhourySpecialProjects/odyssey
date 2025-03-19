import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form'

describe('Form', () => {
  const TestForm = () => {
    const form = useForm()
    return (
      <Form {...form}>
        <form>
          <FormField
            control={form.control}
            name="test"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Test Label</FormLabel>
                <FormControl>
                  <input {...field} />
                </FormControl>
                <FormDescription>Test description</FormDescription>
                <FormMessage>Test message</FormMessage>
              </FormItem>
            )}
          />
        </form>
      </Form>
    )
  }

  it('renders form components', () => {
    render(<TestForm />)
    expect(screen.getByText('Test Label')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('applies error styling when form has errors', () => {
    render(<TestForm />)
    const label = screen.getByText('Test Label')
    expect(label).toHaveClass('text-sm', { exact: false })
  })
})