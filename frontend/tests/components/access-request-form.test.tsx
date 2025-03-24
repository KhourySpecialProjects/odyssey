import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RequestAccessForm } from '@/components/access-request-form'
import { createAccessRequest } from '@/lib/actions'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('@/lib/actions', () => ({
  createAccessRequest: jest.fn()
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

describe('RequestAccessForm', () => {
  const fillForm = async () => {
    fireEvent.change(screen.getByPlaceholderText('Sam'), { target: { value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Serif'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('serif.s@northeastern.edu'), {
      target: { value: 'john.doe@northeastern.edu' }
    })
    fireEvent.click(screen.getByText('Select your affiliation'))
    fireEvent.click(screen.getByText('Select your college/school'))
  }

  it('renders form fields', () => {
    render(<RequestAccessForm />)
    
    expect(screen.getByPlaceholderText('Sam')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Serif')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('serif.s@northeastern.edu')).toBeInTheDocument()
    expect(screen.getByText('Select your affiliation')).toBeInTheDocument()
    expect(screen.getByText('Select your college/school')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<RequestAccessForm />)
    
    fireEvent.click(screen.getByText('Submit Request'))

    await waitFor(() => {
      expect(screen.getAllByText(/required/i)).toHaveLength(2)
    })
  })
})