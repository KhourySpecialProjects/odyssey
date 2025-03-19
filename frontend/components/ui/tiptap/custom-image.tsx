import { Image } from "@tiptap/extension-image";
import { Plugin } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { Node } from "@tiptap/pm/model";
import { deleteImage } from "@/lib/actions";

const CustomImage = Image.extend({
  addProseMirrorPlugins(): Plugin[] {
    return CustomImage.createPlugins();
  }
}) as typeof Image & {
  createPlugins: () => Plugin[];
  addProseMirrorPlugins: () => Plugin[];
};

// Define the static method separately
CustomImage.createPlugins = (): Plugin[] => [
  new Plugin({
    props: {
      handleDOMEvents: {
        keydown: (view: EditorView, event: KeyboardEvent): boolean => {
          if (event.key === "Delete" || event.key === "Backspace") {
            const { state } = view;
            const { selection } = state;
            const { from, to } = selection;

            state.doc.nodesBetween(from, to, (node: Node, pos: number) => {
              if (node.type.name === "image") {
                const imageUrl = node.attrs.src;
                const fileName = imageUrl.split("/").pop();
                deleteImage(fileName);
              }
            });
          }
          return true;
        },
      },
    },
  }),
];

export default CustomImage;
