'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import Text from '@tiptap/extension-text';
import OrderedList from '@tiptap/extension-ordered-list';
import Heading from '@tiptap/extension-heading';
import Placeholder from '@tiptap/extension-placeholder';
import StartingKit from '@tiptap/starter-kit'

const Tiptap = ( { updateContent, initialContent, variant } : { updateContent: (content: string) => void, initialContent: string, variant?: string}) => {
    let extensions = []
    let editorProps: any = {}
    switch(variant) {
        case "droplet-name":
            extensions = [Document, Heading.configure({
                levels: [1],
                HTMLAttributes: {
                    class: "text-6xl font-black text-slate-900"
                }
                 
            }), Text];
            editorProps = {
                attributes: {
                    class: "hover:shadow focus:shadow-lg outline-none rounded-md px-4 py-2"
                }
            }
            break
        case "droplet-description":
            extensions = [Document, Paragraph.configure({
                HTMLAttributes: {
                    class: "text-slate-500 text-pretty md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-slate-400"
                }
            }),
            Placeholder.configure({
                placeholder: "Nothing here yet...",
                emptyEditorClass: "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-2 before:left-4 before:pointer-events-none before:select-none",
            }),
            Text];
            editorProps = {
                attributes: {
                    class: 'mt-1 w-full hover:shadow focus:shadow-lg outline-none rounded-md px-4 py-2',
                }
            }
            break
        case "droplet-overview":
            extensions = [Document, Paragraph,
            Placeholder.configure({
                placeholder: "Nothing here yet...",
                emptyEditorClass: "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-2 before:left-4 before:pointer-events-none before:select-none",
            }),
            Text];
            editorProps = {
                attributes: {
                    class: 'prose prose-sky w-full max-w-2xl p-8 mt-4 border rounded-md bg-slate-50 border-slate-200 hover:shadow focus:shadow-lg outline-none',
                }
            }
            break
        default:
            extensions = [ 
                Document, 
                StartingKit,
                Heading,
                Paragraph, 
                ListItem, 
                BulletList,
                Placeholder.configure({
                    placeholder: "Nothing here yet...",
                    emptyEditorClass: "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-2 before:left-2 before:pointer-events-none before:select-none",
                }), 
                Text, 
                OrderedList ]
            editorProps = {
                attributes: {
                    class: 'border border-slate-200 rounded p-2 w-80 h-52 prose prose-sky prose-table:block prose-table:overflow-x-scroll m-0 overflow-y-scroll',
                }
            }
            break

        
    }
    
  const editor = useEditor({
    extensions: extensions,
    
    onUpdate: ({ editor }) => {
        updateContent(editor.getHTML())
    },
    content: initialContent,
    editorProps: editorProps,
    immediatelyRender: false,
    
  })

  return <EditorContent name="tiptap" editor={editor}/>
}

export default Tiptap