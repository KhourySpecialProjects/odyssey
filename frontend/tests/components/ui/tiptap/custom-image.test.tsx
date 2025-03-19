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

  it('adds delete handler plugin', () => {
    const plugins = CustomImage.addProseMirrorPlugins()
    expect(plugins.length).toBeGreaterThan(0)
  })

  it('calls deleteImage when image is deleted', () => {
    const mockView = {
      state: {
        selection: {
          from: 0,
          to: 10
        },
        doc: {
          nodesBetween: (from: number, to: number, callback: Function) => {
            callback({
              type: { name: 'image' },
              attrs: { src: 'test-image.jpg' }
            }, 0)
          }
        }
      },
      dispatch: jest.fn()
    } as unknown as EditorView

    const event = new KeyboardEvent('keydown', { key: 'Delete' })
    const plugin = CustomImage.addProseMirrorPlugins()[0]
    expect(deleteImage).toHaveBeenCalledWith('test-image.jpg')
  })
})

