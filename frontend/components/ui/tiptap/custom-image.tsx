import { Image } from "@tiptap/extension-image";
import { Plugin } from "@tiptap/pm/state";

import { deleteImage } from "@/lib/actions";

const CustomImage = Image.extend({
  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() || [];
    return [
      ...parentPlugins,

      new Plugin({
        props: {
          handleDOMEvents: {
            keydown: (view, event) => {
              if (event.key === "Delete" || event.key === "Backspace") {
                const { state } = view;
                const { selection } = state;
                const { from, to } = selection;

                state.doc.nodesBetween(from, to, (node, pos) => {
                  if (node.type.name === "image") {
                    const imageUrl = node.attrs.src;
                    const fileName = imageUrl.split("/").pop();
                    deleteImage(fileName);
                  }
                });
              }
            },
          },
        },
      }),
    ];
  },
});

export default CustomImage;
