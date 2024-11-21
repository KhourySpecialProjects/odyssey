"use client";

import { useEditor, EditorContent, JSONContent, Editor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import ListItem from "@tiptap/extension-list-item";
import BulletList from "@tiptap/extension-bullet-list";
import Text from "@tiptap/extension-text";
import OrderedList from "@tiptap/extension-ordered-list";
import Heading from "@tiptap/extension-heading";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import StartingKit from "@tiptap/starter-kit";
import { Bold, Star } from "lucide-react";
import { Suspense, useState, useActionState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Link from '@tiptap/extension-link';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover';
import { Button } from "../button";
import { Input } from '../input';
import { createAuthorizedUser, uploadImage } from "@/lib/actions";
import { LoaderIcon, ArrowUpToLineIcon, XIcon } from "lucide-react"; 
import CustomImage from "./CustomImage";


const Tiptap = ({
  updateContent,
  initialContent,
  variant,
  className,
  json,
  revalidate,
}: {
  updateContent: ((content: string) => void) | ((content: JSONContent) => void);
  initialContent: string | JSONContent;
  variant?: string;
  className?: string;
  json?: boolean;
  revalidate?: () => void;
}) => {
  let extensions = [];
  let editorProps: any = {};
  switch (variant) {
    case "droplet-name":
      extensions = [
        Document,
        Heading.configure({
          levels: [1],
          HTMLAttributes: {
            class: "text-6xl font-black text-slate-900",
          },
        }),
        Text,
      ];
      editorProps = {
        attributes: {
          class:
            "hover:shadow focus:shadow-lg outline-none rounded-md px-4 py-2",
        },
      };
      break;
    case "droplet-description":
      extensions = [
        Document,
        Paragraph.configure({
          HTMLAttributes: {
            class:
              "text-slate-500 text-pretty md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-slate-400",
          },
        }),
        Placeholder.configure({
          placeholder: "Nothing here yet...",
          emptyEditorClass:
            "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-2 before:left-4 before:pointer-events-none before:select-none",
        }),
        Text,
      ];
      editorProps = {
        attributes: {
          class:
            "mt-1 w-full hover:shadow focus:shadow-lg outline-none rounded-md px-4 py-2",
        },
      };
      break;
    case "droplet-overview":
      extensions = [
        Document,
        Paragraph,
        Placeholder.configure({
          placeholder: "Nothing here yet...",
          emptyEditorClass:
            "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-8 before:left-8 before:pointer-events-none before:select-none",
        }),
        Text,
      ];
      editorProps = {
        attributes: {
          class:
            "prose prose-sky w-full max-w-2xl p-8 mt-4 border rounded-md bg-slate-50 border-slate-200 hover:shadow focus:shadow-lg outline-none",
        },
      };
      break;
    case "lesson-generic":
      extensions = [
        Link,
        CustomImage.configure({
          inline: false,
          allowBase64: true,
        }),
        Underline,
        StartingKit,
        Placeholder.configure({
          placeholder: "Nothing here yet...",
          emptyEditorClass:
            "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-3 before:left-3 before:pointer-events-none before:select-none",
        }),
        
      ];
      editorProps = {
        attributes: {
          class:
            "w-full border min-h-32 border-slate-200 p-3 prose prose-lg prose-sky prose-table:block prose-table:overflow-x-scroll rounded-b-md hover:shadow focus:shadow-lg outline-none",
        },
      };
      break;
    case "lesson-expandable-body":
      extensions = [
        StartingKit,
        Link,
        CustomImage.configure({
          inline: false,
          allowBase64: true,
        }),
        Placeholder.configure({
          placeholder: "Nothing here yet...",
          emptyEditorClass:
            "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-2 before:left-2 before:pointer-events-none before:select-none",
        }),
      ];
      editorProps = {
        attributes: {
          class:
            "prose prose-sky  p-2 max-w-full min-h-32 border rounded-b-md border-slate-200 hover:shadow focus:shadow-lg outline-none",
        },
      };
      break;
    case "lesson-callout":
      extensions = [
        StartingKit,
        Link,
        Underline,
        CustomImage.configure({
          inline: false,
          allowBase64: true,
        }),
        Placeholder.configure({
          placeholder: "Nothing here yet...",
          emptyEditorClass:
            "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-2 before:left-2 before:pointer-events-none before:select-none",
        }),
      ];
      editorProps = {
        attributes: {
          class:
            "prose prose-sky  p-2 min-w-full max-w-2xl min-h-20 border rounded-b-md border-slate-200 hover:shadow focus:shadow-lg outline-none",
        },
      };
      break;
    case "lesson-name":
      extensions = [
        Document,
        Heading.configure({
          levels: [1],
          HTMLAttributes: {
            class: "text-4xl font-extrabold text-balance",
          },
        }),
        Text,
      ];
      editorProps = {
        attributes: {
          class:
            "hover:shadow focus:shadow-lg outline-none rounded-md px-4 py-2",
        },
      };
      break;

    default:
      extensions = [
        StartingKit,

        Placeholder.configure({
          placeholder: "Nothing here yet...",
          emptyEditorClass:
            "before:content-[attr(data-placeholder)] before:text-gray-500 before:absolute before:top-2 before:left-2 before:pointer-events-none before:select-none",
        }),
      ];
      editorProps = {
        attributes: {
          class:
            "border border-slate-200 rounded p-2 w-80 h-52 prose prose-sky prose-table:block prose-table:overflow-x-scroll m-0 overflow-y-scroll",
        },
      };
      break;
  }

  const editor = useEditor({
    extensions: extensions,

    onUpdate: ({ editor }) => {
      if (json) {
        (updateContent as (content: JSONContent) => void)(editor.getJSON());
      } else {
        (updateContent as (content: string) => void)(editor.getHTML());
      }
    },

    onDestroy: () => {
      if (revalidate) {
        revalidate();
      }
    },
    content: initialContent,
    editorProps: editorProps,
    immediatelyRender: false,
  });

  if (variant && (variant == "lesson-callout" || variant == "lesson-expandable-body") || variant == "lesson-generic") {

    return (
      <div>
        <div className="w-full border border-b-transparent rounded-t-md  border-slate-200 bg-white p-1 space-x-0.5">

          <button className={cn(editor?.isActive('bold') ? "bg-slate-200" : "", "p-2.5 rounded-md border border-transparent hover:border-slate-200")}
          onClick={() => editor?.chain().focus().toggleBold().run()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" fill="none" viewBox="0 0 24 24" className="sc-bdvvtL sc-gGCDDS cYLxRJ ggfEtu"><path fill="#32324D" fillRule="evenodd" d="M7.4 1.2H4.2v21.6h3.2V1.2Zm11.6 6a6 6 0 0 1-1.5 4 6.4 6.4 0 0 1-3.8 11.6H7.4v-3.2h6.3c1.8 0 3.3-1.4 3.3-3.2 0-1.8-1.5-3.2-3.3-3.2H7.4V10H13a2.8 2.8 0 0 0 0-5.6H7.4V1.2H13a6 6 0 0 1 6 6Z" clipRule="evenodd"></path></svg>
          </button>
          
          <button className={cn(editor?.isActive('italic') ? "bg-slate-200" : "", "p-2.5 rounded-md border border-transparent hover:border-slate-200")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" fill="none" viewBox="0 0 24 24" className="sc-bdvvtL sc-gGCDDS cYLxRJ ggfEtu"><path fill="#32324D" d="M19.7 1H9.4v3h3.1l-4 16H4.2v3h10.3v-3h-3.3l4.2-16h4.2V1Z"></path></svg>
          </button>


          <button className={cn(editor?.isActive('underline') ? "bg-slate-200" : "", "p-2.5 rounded-md border border-transparent hover:border-slate-200")}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" fill="none" viewBox="0 0 24 24" className="sc-bdvvtL sc-gGCDDS cYLxRJ ggfEtu"><path fill="#32324D" d="M12 17.3c1.99 0 3.9-.74 5.3-2.07a6.9 6.9 0 0 0 2.2-5.01V1h-3v9.22c0 1.13-.47 2.2-1.32 3A4.63 4.63 0 0 1 12 14.48c-1.2 0-2.34-.45-3.18-1.24a4.14 4.14 0 0 1-1.32-3.01V1h-3v9.22a6.9 6.9 0 0 0 2.2 5.01 7.73 7.73 0 0 0 5.3 2.08Zm9.75 2.14H2.25v2.83h19.5v-2.83Z"></path></svg>
          </button>

          <button className={cn(editor?.isActive('strike') ? "bg-slate-200" : "", "p-2.5 rounded-md border border-transparent hover:border-slate-200")}
          onClick={() => editor?.chain().focus().toggleStrike().run()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" fill="none" viewBox="0 0 24 24" className="sc-bdvvtL sc-gGCDDS cYLxRJ ggfEtu"><path fill="#32324D" d="M16.39 2.17c.68.1 1.17.2 1.46.39.39.2.58.39.78.58.2.3.3.78.39 1.18l.78 3.5h1.95V1H2.84l-.59 6.83H4l.98-3.9a5 5 0 0 1 .39-.98c.2-.2.49-.39.88-.58.39-.1.88-.3 1.56-.3.58 0 1.36-.1 2.34-.1v8.78h-7.8v1.95h7.8v7.41c0 .2.1.3-.1.39-.2.1-.39.2-.88.2l-2.04.39-.1 1.36h9.94l-.1-1.36-2.04-.3c-.49 0-.69-.1-.78-.2-.2-.09-.1-.19-.1-.38V12.7h7.8v-1.95h-7.8V1.97c.98 0 1.85.1 2.44.2Z"></path></svg>
          </button>
          
        
          <LinkToolButton editor={editor}/>

          <button className={cn(editor?.isActive('bulletList') ? "bg-slate-200" : "", "p-2.5 rounded-md border border-transparent hover:border-slate-200")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" fill="none" viewBox="0 0 24 24" className="sc-bdvvtL sc-gGCDDS cYLxRJ ggfEtu"><path fill="#32324D" fillRule="evenodd" d="M3.64 7.23a2.14 2.14 0 1 1 0-4.27 2.14 2.14 0 0 1 0 4.27Zm4.98-3.25H22.5v2.37H8.62V3.98Zm-7.12 8.1a2.14 2.14 0 1 0 4.27 0 2.14 2.14 0 0 0-4.27 0Zm2.14 9.04a2.14 2.14 0 1 1 0-4.27 2.14 2.14 0 0 1 0 4.27ZM22.5 10.87H8.62v2.37H22.5v-2.37Zm-13.88 6.9H22.5v2.37H8.62v-2.37Z" clipRule="evenodd"></path></svg>
          </button>

          <button className={cn(editor?.isActive('orderedList') ? "bg-slate-200" : "", "p-2.5 rounded-md border border-transparent hover:border-slate-200")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" fill="none" viewBox="0 0 24 24" className="sc-bdvvtL sc-gGCDDS dMoqVa kkJjHV"><path fill="#32324D" d="M3.74 2.7v3.85h1.04v.85H1.56v-.85H2.6V3.8H1.56v-.77l2.18-.33Zm-.72 10.92.01.04h1.75v.76H1.55v-.67l1.52-1.57c.19-.22.34-.41.43-.58a.99.99 0 0 0 .14-.45.64.64 0 0 0-.14-.43.51.51 0 0 0-.4-.16.43.43 0 0 0-.39.2.96.96 0 0 0-.14.53H1.52v-.02c-.02-.43.12-.79.41-1.09.3-.3.68-.44 1.16-.44.52 0 .91.12 1.2.37.29.25.43.6.43 1.04 0 .29-.08.55-.23.78-.15.22-.43.56-.84 1l-.63.7Zm1.63 5.85a1.25 1.25 0 0 0-.59-.42c.22-.1.4-.24.53-.41a1.16 1.16 0 0 0-.26-1.57c-.3-.23-.7-.35-1.21-.35-.43 0-.8.12-1.1.35-.31.23-.46.55-.45.92l.01.03h1.05c0-.19.05-.25.16-.33a.6.6 0 0 1 .37-.13c.18 0 .31.05.4.15.1.1.15.22.15.37a.6.6 0 0 1-.16.44.6.6 0 0 1-.45.17h-.5v.75h.5c.22 0 .39.07.5.17.12.1.18.28.18.5 0 .16-.05.3-.17.4a.64.64 0 0 1-.45.17.64.64 0 0 1-.42-.18.47.47 0 0 1-.18-.4H1.51l-.01.05c-.01.43.15.78.47 1 .33.23.71.35 1.15.35.5 0 .92-.12 1.25-.36.33-.24.49-.58.49-1 0-.26-.07-.48-.21-.67ZM8.4 3.97h14.1v2.38H8.4V3.98Zm14.1 6.9H8.4v2.37h14.1v-2.37Zm-14.1 6.9h14.1v2.37H8.4v-2.37Z"></path></svg>
          </button>
          <ImageToolButton editor={editor}/>
        </div>
        
        <EditorContent className={className} name="tiptap" editor={editor} />
        
        
      </div>
      );
    } else {
      return (
        <EditorContent className={className} name="tiptap" editor={editor} />
      )
    }
    
  
  
};

export default Tiptap;

function ImageToolButton({editor} : {editor : Editor | null}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const insertImage = async (prevState: any, formData : FormData) => {
    const newFormData : FormData = new FormData();
    newFormData.append("image", file as Blob);
    
    const response = await uploadImage(newFormData);
    if (response.ok && response.url) {
      editor?.chain().focus().setImage({src: response.url}).createParagraphNear().focus().run();
      setFile(null);
    }
    setOpen(false);
    setFile(null);
    console.log(response)
  }

 
  const initialState : any = { image : null };

  const [state, formAction, isPending] = useActionState(insertImage, initialState);
  
  
  const disabled =  !(editor?.view.state.selection.$from.node().type.name == "doc" || editor?.view.state.selection.$from.node(-1).type.name == "doc");
  

  
  return (
    <Popover open={open}> 
      <PopoverTrigger asChild disabled={disabled}>
        <button onClick={() => {
          setOpen(!open);
          editor?.chain().focus().run();
        }} className={cn(disabled ? "" : "hover:border-slate-200","p-2.5 rounded-md border border-transparent")}>
          <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" fill="none" viewBox="0 0 24 24" className="sc-bdvvtL sc-gGCDDS dUqgZq kkJjHV"><path fill="#32324D" fillRule="evenodd" d="M2.719 19.316V4.682H21.28v14.634H2.72ZM1 3.288c0-.192.154-.348.344-.348h21.312c.19 0 .344.156.344.348V20.71a.346.346 0 0 1-.344.349H1.344a.346.346 0 0 1-.344-.35V3.29Zm14.812 8.02a1.919 1.919 0 1 0 0-3.837 1.919 1.919 0 0 0 0 3.837ZM5.443 17.263h12.783a.547.547 0 0 0 .456-.87l-1.763-2.394a.547.547 0 0 0-.825-.072l-1.812 1.725-4.206-5.71a.547.547 0 0 0-.9.025L4.972 16.42a.547.547 0 0 0 .472.844Z" clipRule="evenodd"></path></svg>
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <form action={formAction}>
          <FileUpload file={file} setFile={setFile}/>
        
          <div className="w-full flex justify-between items-center">
            <PopoverClose onClick={() => setOpen(false)} asChild>
              <Button before={<XIcon/>} className="m-2">
                Close
              </Button>
            </PopoverClose>
            <Button after={isPending ? <LoaderIcon className="animate-spin"/> : <ArrowUpToLineIcon/>} variant="outline" type="submit">Upload</Button>
          </div>

        </form>
      </PopoverContent>
    </Popover>
  );
}

function LinkToolButton({editor} : {editor : Editor | null}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const savedSelection = useRef(null);

  const insertLink = () => {
    editor?.chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();

    setOpen(false);

  
  }

  const handleOpen = () => {
    if (editor?.isActive('link')) {
      editor.chain().focus().unsetLink().run();
    } else {
      setOpen(true)
      
    }
  }

  return (
    <Popover open={open}>
      <PopoverTrigger asChild onClick={handleOpen}>
          <button className={cn(editor?.isActive('link') ? "bg-slate-200" : "","p-2.5 rounded-md border border-transparent hover:border-slate-200")} >
            <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" fill="none" viewBox="0 0 24 24" className="sc-bdvvtL sc-gGCDDS dMoqVa kkJjHV"><path fill="#212134" d="M21.415 1.344a6.137 6.137 0 0 0-8.525.838L11.095 4.33a1.53 1.53 0 1 0 2.35 1.963l1.794-2.148a3.054 3.054 0 0 1 4.365-.324 3.117 3.117 0 0 1 .255 4.301l-3.73 4.467-.035.038a3.048 3.048 0 0 1-4.53.078 1.531 1.531 0 0 0-2.241 2.086 6.114 6.114 0 0 0 9.159-.245l3.721-4.454a6.289 6.289 0 0 0 1.418-4.62 6.01 6.01 0 0 0-2.206-4.128Z"></path><path fill="#212134" d="m10.399 17.884-1.604 1.92a3.118 3.118 0 0 1-4.278.513 3.052 3.052 0 0 1-.457-4.353l3.795-4.542.028-.031a3.042 3.042 0 0 1 4.584-.022 1.529 1.529 0 0 0 1.794.37c.197-.094.37-.228.51-.395l.018-.022a1.51 1.51 0 0 0-.025-1.977 6.11 6.11 0 0 0-9.27.126l-3.784 4.53a6.137 6.137 0 0 0 .692 8.539 6.01 6.01 0 0 0 4.454 1.437 6.289 6.289 0 0 0 4.294-2.217l1.598-1.913a1.53 1.53 0 0 0-2.35-1.963Z"></path></svg>
          </button>
      </PopoverTrigger>

      <PopoverContent autoFocus={false}>
        
          <Input value={url} onChange={(e : any) => setUrl(e.target.value)} type="text" tabIndex={-1}/>
          <div className="w-full flex justify-between items-center">
            <PopoverClose onClick={() => setOpen(false)} asChild>
              <Button before={<XIcon/>} className="m-2">
                Close
              </Button>
            </PopoverClose>
            <Button variant="outline" onClick={insertLink}>Insert</Button>
          </div>
        
      </PopoverContent>
    </Popover>
  );
}

const FileUpload = ({file, setFile} : {file : File | null, setFile : (file: File | null) => void}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e : any) => {
    console.log(e)
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e : any) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      console.log(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e : any) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  return (
    <div
      className={`flex flex-col items-center max-w-xs mx-auto p-4 border-2 rounded-lg cursor-pointer 
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 border-dashed'}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <label className="bg-blue-500 text-white py-2 px-4 rounded mb-4 cursor-pointer">
        {file ? 'Change File' : 'Upload or Drag File Here'}
        <input
          name="image"
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {file && (
        <div className="flex items-center justify-between w-full">
          <span className="truncate flex-grow">{file.name}</span>
          <button
            className="bg-red-500 text-white py-1 px-2 rounded ml-2"
            onClick={handleRemoveFile}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};
