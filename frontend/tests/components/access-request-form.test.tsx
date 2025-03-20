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
    fireEvent.click(screen.getByText(/student/i))
    fireEvent.click(screen.getByText('Select your college/school'))
    fireEvent.click(screen.getByText('Khoury College of Computer Sciences'))
  }

  it('renders form fields', () => {
    render(<RequestAccessForm />)
    
    expect(screen.getByPlaceholderText('Sam')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Serif')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('serif.s@northeastern.edu')).toBeInTheDocument()
    expect(screen.getByText('Select your affiliation')).toBeInTheDocument()
    expect(screen.getByText('Select your college/school')).toBeInTheDocument()
  })

  it('handles successful form submission', async () => {
    (createAccessRequest as jest.Mock).mockResolvedValue({ ok: true })
    render(<RequestAccessForm />)
    
    await fillForm()
    fireEvent.click(screen.getByText('Submit Request'))

    await waitFor(() => {
      expect(createAccessRequest).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith(
        'Your access request has been successfully submitted.'
      )
    })
  })

  it('handles form submission error', async () => {
    (createAccessRequest as jest.Mock).mockResolvedValue({ 
      ok: false, 
      error: 'Submission failed' 
    })
    render(<RequestAccessForm />)
    
    await fillForm()
    fireEvent.click(screen.getByText('Submit Request'))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Uh oh! Something went wrong.',
        { description: 'Submission failed' }
      )
    })
  })

  it('validates required fields', async () => {
    render(<RequestAccessForm />)
    
    fireEvent.click(screen.getByText('Submit Request'))

    await waitFor(() => {
      expect(screen.getAllByText(/required/i)).toHaveLength(2)
    })
  })
})