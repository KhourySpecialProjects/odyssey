import { Image } from '@tiptap/extension-image';
import { Plugin } from '@tiptap/pm/state';
import { deleteImage } from '@/lib/actions';

const CustomImage = Image.extend({
  
  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() || [];
    return [
      ...parentPlugins,
      
      new Plugin({
        props: {
          handleDOMEvents: {
            keydown: (view, event) => {
              // Check if delete or backspace was pressed
              if (event.key === 'Delete' || event.key === 'Backspace') {
                const { state } = view
                const { selection } = state
                const { from, to } = selection

                // Find images within the selection
                state.doc.nodesBetween(from, to, (node, pos) => {
                  if (node.type.name === 'image') {
                    // Get image src before deletion
                    const imageUrl = node.attrs.src
                    // Call the onImageDelete callback
                    const fileName = imageUrl.split("/").pop();
                    console.log(fileName)
                    deleteImage(fileName);
                    
                  }
                })
              }
            },
            
          },
        },
      })
    ];
  },
  
});

export default CustomImage;