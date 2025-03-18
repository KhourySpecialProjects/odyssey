import { deleteImage } from '@/lib/actions'
import CustomImage from '@/components/ui/tiptap/custom-image'

jest.mock('@/lib/actions', () => ({
  deleteImage: jest.fn()
}))

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
    }

    const event = new KeyboardEvent('keydown', { key: 'Delete' })
    const plugin = CustomImage.addProseMirrorPlugins()[0]
    const result = plugin.props.handleDOMEvents.keydown(mockView, event)

    expect(result).toBe(true)
    expect(deleteImage).toHaveBeenCalledWith('test-image.jpg')
  })
})
