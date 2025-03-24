import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createBugReport } from '@/lib/actions'
import { toast } from 'sonner'
import { ReportBugForm } from '@/components/droplets/reports/bug/form'

// Mock dependencies
jest.mock('@/lib/actions')
jest.mock('sonner')
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  usePathname: () => '/test-path'
}))

describe('ReportBugForm', () => {
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders form fields correctly', () => {
    render(<ReportBugForm onSuccess={mockOnSuccess} />)
    
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Path/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
  })

  it('pre-fills form with provided user data', () => {
    const name = 'John Doe'
    const email = 'john@northeastern.edu'
    
    render(<ReportBugForm name={name} email={email} onSuccess={mockOnSuccess} />)
    
    expect(screen.getByDisplayValue(name)).toBeInTheDocument()
    expect(screen.getByDisplayValue(email)).toBeInTheDocument()
  })
})