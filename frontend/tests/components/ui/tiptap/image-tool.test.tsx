import { render, screen, fireEvent } from '@testing-library/react'
import ImageToolButton from '@/components/ui/tiptap/toolbar/tools/image-tool'
import { uploadImage } from '@/lib/actions'
import { Editor } from '@tiptap/react'

jest.mock('@/lib/actions', () => ({
  uploadImage: jest.fn()
}))

describe('ImageToolButton', () => {
  const mockEditor = {
    chain: jest.fn().mockReturnThis(),
    focus: jest.fn().mockReturnThis(),
    setImage: jest.fn().mockReturnThis(),
    createParagraphNear: jest.fn().mockReturnThis(),
    run: jest.fn(),
    view: {
      state: {
        selection: {
          $from: {
            node: () => ({ type: { name: 'doc' } })
          }
        }
      }
    }
  } as unknown as Editor

  it('renders image button', () => {
    render(<ImageToolButton editor={mockEditor} />)
    expect(screen.getByTitle('Image')).toBeInTheDocument()
  })

  it('opens popover on click', () => {
    render(<ImageToolButton editor={mockEditor} />)
    fireEvent.click(screen.getByTitle('Image'))
    expect(screen.getByText('Upload or Drag File Here')).toBeInTheDocument()
  })

  it('handles file upload', async () => {
    (uploadImage as jest.Mock).mockResolvedValue({ ok: true, url: 'test.jpg' })
    render(<ImageToolButton editor={mockEditor} />)
    
    fireEvent.click(screen.getByTitle('Image'))
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText('Upload or Drag File Here')
    
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByText('Upload'))

    expect(uploadImage).toHaveBeenCalled()
  })
})