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

  it('submits form with valid data', async () => {
    const mockCreateBugReport = createBugReport as jest.Mock
    mockCreateBugReport.mockResolvedValue({ ok: true })

    render(<ReportBugForm onSuccess={mockOnSuccess} />)
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' }
    })
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'john@northeastern.edu' }
    })
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: 'Test bug description' }
    })
    
    fireEvent.submit(screen.getByRole('button', { name: /Submit Report/i }))

    await waitFor(() => {
      expect(mockCreateBugReport).toHaveBeenCalledWith({
        fullName: 'John Doe',
        email: 'john@northeastern.edu',
        path: '/test-path',
        description: 'Test bug description'
      })
      expect(mockOnSuccess).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalled()
    })
  })

  it('shows error toast on submission failure', async () => {
    const mockCreateBugReport = createBugReport as jest.Mock
    mockCreateBugReport.mockResolvedValue({ ok: false, error: 'Test error' })

    render(<ReportBugForm onSuccess={mockOnSuccess} />)
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' }
    })
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'john@northeastern.edu' }
    })
    
    fireEvent.submit(screen.getByRole('button', { name: /Submit Report/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })
})