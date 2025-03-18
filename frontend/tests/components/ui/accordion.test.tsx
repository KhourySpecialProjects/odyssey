import { render, screen, fireEvent } from '@testing-library/react'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'

describe('Accordion', () => {
  const TestAccordion = () => (
    <Accordion type="single">
      <AccordionItem value="item-1">
        <AccordionTrigger>Section 1</AccordionTrigger>
        <AccordionContent>Content 1</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Section 2</AccordionTrigger>
        <AccordionContent>Content 2</AccordionContent>
      </AccordionItem>
    </Accordion>
  )

  it('renders accordion items', () => {
    render(<TestAccordion />)
    expect(screen.getByText('Section 1')).toBeInTheDocument()
    expect(screen.getByText('Section 2')).toBeInTheDocument()
  })

  it('shows content when trigger is clicked', () => {
    render(<TestAccordion />)
    const trigger = screen.getByText('Section 1')
    fireEvent.click(trigger)
    expect(screen.getByText('Content 1')).toBeVisible()
  })

  it('applies correct styling to trigger', () => {
    render(<TestAccordion />)
    const trigger = screen.getByText('Section 1').closest('button')
    expect(trigger).toHaveClass('flex', 'flex-1', 'items-center', 'justify-between')
  })

  it('applies correct styling to content', () => {
    render(<TestAccordion />)
    const content = screen.getByText('Content 1').parentElement
    expect(content).toHaveClass('overflow-hidden', 'text-sm')
  })
})