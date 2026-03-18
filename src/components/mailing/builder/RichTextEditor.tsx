"use client"

import React, { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Link } from '@tiptap/extension-link'
import { TextAlign } from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Mention } from '@tiptap/extension-mention'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/animations/scale.css'
import { cn } from '@/lib/utils'
import { MentionList, MENTION_VARIABLES } from './MentionList'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Palette
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  className?: string
  style?: React.CSSProperties
}

export function RichTextEditor({ value, onChange, onFocus, onBlur, className, style }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: 'כתוב משהו...',
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention-variable',
        },
        renderLabel({ node }) {
          return `@${node.attrs.label}`
        },
        suggestion: {
          items: ({ query }) => {
            return MENTION_VARIABLES.filter(item =>
              item.label.toLowerCase().includes(query.toLowerCase()) || 
              item.id.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 5)
          },
          render: () => {
            let component: any
            let popup: any

            return {
              onStart: props => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                })

                if (!props.clientRect) {
                  return
                }

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as any,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                })
              },

              onUpdate: props => {
                component.updateProps(props)

                if (!props.clientRect) {
                  return
                }

                popup[0].setProps({
                  getReferenceClientRect: props.clientRect as any,
                })
              },

              onKeyDown: props => {
                if (props.event.key === 'Escape') {
                  popup[0].hide()
                  return true
                }

                return component.ref?.onKeyDown(props)
              },

              onExit: () => {
                popup[0].destroy()
                component.destroy()
              },
            }
          },
        },
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    onFocus,
    onBlur,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[20px] text-inherit',
          'rtl:text-right text-right'
        ),
        dir: 'rtl',
      },
    },
  })

  // Synchronize external value only if it's different from current editor content
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) {
    return null
  }

  const BubbleButton = ({ 
    onClick, 
    isActive = false, 
    children, 
    title 
  }: { 
    onClick: () => void, 
    isActive?: boolean, 
    children: React.ReactNode,
    title?: string
  }) => (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      title={title}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-lg transition-all duration-200",
        isActive 
          ? "bg-primary/10 text-primary shadow-sm" 
          : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
      )}
    >
      {children}
    </button>
  )

  return (
    <div 
      className={cn("relative w-full cursor-text", className)} 
      style={style}
      onClick={(e) => {
        // If clicking the container but not the editor, focus the editor
        if (editor && !editor.isFocused) {
          editor.commands.focus()
        }
      }}
    >
      {editor && (
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ 
            duration: 100,
            animation: 'scale',
            placement: 'top',
            zIndex: 1000,
            offset: [0, 10]
          }}
          className="flex items-center gap-0.5 p-1 bg-white border border-slate-100 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.06)] animate-in fade-in zoom-in duration-200"
        >
          <div className="flex items-center gap-0.5 border-l border-slate-100 ml-1 pl-1">
            <BubbleButton 
              onClick={() => editor.chain().focus().toggleBold().run()} 
              isActive={editor.isActive('bold')}
              title="מודגש"
            >
              <Bold className="h-3.5 w-3.5" />
            </BubbleButton>
            <BubbleButton 
              onClick={() => editor.chain().focus().toggleItalic().run()} 
              isActive={editor.isActive('italic')}
              title="נטוי"
            >
              <Italic className="h-3.5 w-3.5" />
            </BubbleButton>
            <BubbleButton 
              onClick={() => editor.chain().focus().toggleUnderline().run()} 
              isActive={editor.isActive('underline')}
              title="קו תחתי"
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </BubbleButton>
          </div>

          <div className="flex items-center gap-0.5 border-l border-slate-100 ml-1 pl-1">
            <BubbleButton 
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
              isActive={editor.isActive('heading', { level: 1 })}
              title="כותרת 1"
            >
              <Heading1 className="h-3.5 w-3.5" />
            </BubbleButton>
            <BubbleButton 
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
              isActive={editor.isActive('heading', { level: 2 })}
              title="כותרת 2"
            >
              <Heading2 className="h-3.5 w-3.5" />
            </BubbleButton>
          </div>

          <div className="flex items-center gap-0.5 border-l border-slate-100 ml-1 pl-1">
            <BubbleButton 
              onClick={() => editor.chain().focus().setTextAlign('left').run()} 
              isActive={editor.isActive({ textAlign: 'left' })}
              title="יישור לשמאל"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </BubbleButton>
            <BubbleButton 
              onClick={() => editor.chain().focus().setTextAlign('center').run()} 
              isActive={editor.isActive({ textAlign: 'center' })}
              title="מרכז"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </BubbleButton>
            <BubbleButton 
              onClick={() => editor.chain().focus().setTextAlign('right').run()} 
              isActive={editor.isActive({ textAlign: 'right' })}
              title="יישור לימין"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </BubbleButton>
          </div>

          <div className="flex items-center gap-0.5">
            <BubbleButton 
              onClick={() => editor.chain().focus().toggleBulletList().run()} 
              isActive={editor.isActive('bulletList')}
              title="רשימה"
            >
              <List className="h-3.5 w-3.5" />
            </BubbleButton>
            <BubbleButton 
              onClick={() => editor.chain().focus().unsetLink().run()} 
              isActive={editor.isActive('link')}
              title="ביטול קישור"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </BubbleButton>
            <BubbleButton 
              onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} 
              title="נקה עיצוב"
            >
              <Palette className="h-3.5 w-3.5" />
            </BubbleButton>
          </div>
        </BubbleMenu>
      )}

      <EditorContent editor={editor} />

      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: right;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror {
          min-height: 20px;
          outline: none !important;
        }
        .ProseMirror p {
          margin-top: 0;
          margin-bottom: 0.5rem;
        }
        .ProseMirror h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; }
        .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; }
        .ProseMirror h3 { font-size: 1.2em; font-weight: bold; margin-bottom: 0.5em; }
        .ProseMirror ul { list-style-type: disc; padding-right: 1.5em; margin-bottom: 1em; }
        .ProseMirror ol { list-style-type: decimal; padding-right: 1.5em; margin-bottom: 1em; }
        .ProseMirror a { color: #2563eb; text-decoration: underline; cursor: pointer; }
        
        .mention-variable {
          padding: 2px 6px;
          border-radius: 6px;
          background-color: #f1f5f9;
          color: #334155;
          font-weight: 700;
          font-size: 0.85em;
          border: 1px solid #e2e8f0;
          margin: 0 2px;
          display: inline-flex;
          align-items: center;
          vertical-align: middle;
          line-height: 1;
        }
        .dark .mention-variable {
          background-color: #1e293b;
          color: #f1f5f9;
          border-color: #334155;
        }
      `}</style>
    </div>
  )
}
