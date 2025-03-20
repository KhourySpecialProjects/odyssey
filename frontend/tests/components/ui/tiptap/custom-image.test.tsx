import { deleteImage } from '@/lib/actions'
import CustomImage from '@/components/ui/tiptap/custom-image'
import { EditorView } from '@tiptap/pm/view'

jest.mock('@/lib/actions', () => ({
  deleteImage: jest.fn()
}))

// Mock the CustomImage extension
jest.mock('@/components/ui/tiptap/custom-image', () => ({
  __esModule: true,
  default: {
    addProseMirrorPlugins: () => [{
      key: 'customImage',
      props: {
        handleKeyDown: jest.fn()
      }
    }]
  }
}));

describe('CustomImage', () => {
  it('extends Image extension', () => {
    expect(CustomImage.name).toBe('image')
  })

  it('calls deleteImage when image is deleted', () => {
    const view = {
      state: {
        doc: {
          nodesBetween: jest.fn((from, to, fn) => {
            fn({ type: { name: 'image' }, attrs: { src: 'test-image.jpg' } }, 0)
          })
        },
        selection: { from: 0, to: 1 }
      }
    } as unknown as EditorView

    const event = new KeyboardEvent('keydown', { key: 'Delete' })
    const plugin = CustomImage.addProseMirrorPlugins()[0]
    
    expect(deleteImage).toHaveBeenCalledWith('test-image.jpg')
  })
})

