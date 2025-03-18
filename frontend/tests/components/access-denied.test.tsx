import { render, screen, fireEvent } from '@testing-library/react'
import AccessDenied from '@/components/access-denied'
import { signIn } from 'next-auth/react'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn()
}))

describe('AccessDenied', () => {
  it('renders access denied message', () => {
    render(<AccessDenied />)
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
  })

  it('renders sign in link', () => {
    render(<AccessDenied />)
    expect(screen.getByText('signed in')).toBeInTheDocument()
  })

  it('calls signIn when link is clicked', () => {
    render(<AccessDenied />)
    fireEvent.click(screen.getByText('signed in'))
    expect(signIn).toHaveBeenCalled()
  })
})