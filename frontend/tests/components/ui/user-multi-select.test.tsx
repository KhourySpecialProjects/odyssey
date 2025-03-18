import { render, fireEvent, waitFor } from '@testing-library/react'
import { UserMultiSelect } from '@/components/ui/user-multi-select'
import { fetchAllUsers } from '@/lib/requests/users'

// Mock the fetchAllUsers function
jest.mock('@/lib/requests/users', () => ({
  fetchAllUsers: jest.fn()
}))

describe('UserMultiSelect', () => {
  const mockUsers = [
    { id: 1, firstName: 'John', lastName: 'Doe' },
    { id: 2, firstName: 'Jane', lastName: 'Smith' }
  ]

  beforeEach(() => {
    (fetchAllUsers as jest.Mock).mockResolvedValue(mockUsers)
  })

  it('renders select button with placeholder', () => {
    const { getByRole } = render(
      <UserMultiSelect selectedIds={[]} onChange={() => {}} />
    )
    
    expect(getByRole('combobox')).toHaveTextContent('Select users...')
  })

  it('fetches and displays users', async () => {
    const { getByRole, getByText } = render(
      <UserMultiSelect selectedIds={[]} onChange={() => {}} />
    )

    fireEvent.click(getByRole('combobox'))

    await waitFor(() => {
      expect(getByText('John Doe')).toBeInTheDocument()
      expect(getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('displays selected users in button', async () => {
    const { getByRole } = render(
      <UserMultiSelect selectedIds={[1]} onChange={() => {}} />
    )

    await waitFor(() => {
      expect(getByRole('combobox')).toHaveTextContent('John Doe')
    })
  })

  it('handles user selection', async () => {
    const handleChange = jest.fn()
    const { getByRole, getByText } = render(
      <UserMultiSelect selectedIds={[]} onChange={handleChange} />
    )

    fireEvent.click(getByRole('combobox'))

    await waitFor(() => {
      fireEvent.click(getByText('John Doe'))
      expect(handleChange).toHaveBeenCalledWith([1])
    })
  })

  it('handles user deselection', async () => {
    const handleChange = jest.fn()
    const { getByRole, getByText } = render(
      <UserMultiSelect selectedIds={[1]} onChange={handleChange} />
    )

    fireEvent.click(getByRole('combobox'))

    await waitFor(() => {
      fireEvent.click(getByText('John Doe'))
      expect(handleChange).toHaveBeenCalledWith([])
    })
  })

  it('filters users with search', async () => {
    const { getByRole, getByPlaceholderText, queryByText } = render(
      <UserMultiSelect selectedIds={[]} onChange={() => {}} />
    )

    fireEvent.click(getByRole('combobox'))

    await waitFor(() => {
      const searchInput = getByPlaceholderText('Search users...')
      fireEvent.change(searchInput, { target: { value: 'John' } })
      
      expect(queryByText('John Doe')).toBeInTheDocument()
      expect(queryByText('Jane Smith')).not.toBeInTheDocument()
    })
  })

  it('shows empty state when no users match search', async () => {
    const { getByRole, getByPlaceholderText, getByText } = render(
      <UserMultiSelect selectedIds={[]} onChange={() => {}} />
    )

    fireEvent.click(getByRole('combobox'))

    await waitFor(() => {
      const searchInput = getByPlaceholderText('Search users...')
      fireEvent.change(searchInput, { target: { value: 'NonexistentUser' } })
      
      expect(getByText('No users found.')).toBeInTheDocument()
    })
  })
})