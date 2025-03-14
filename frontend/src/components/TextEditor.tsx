import Quill, { Range, Delta, EmitterSource } from 'quill'
import { useEffect, useLayoutEffect, useRef } from 'react'
import DOMPurify from 'dompurify'
import 'quill/dist/quill.snow.css'
import './TextEditor.css'

interface TextEditorProps {
  readOnly?: boolean
  defaultValue?: string
  onChange?: (html: string) => void
  onTextChange?: (delta: Delta, oldContent: Delta, source: EmitterSource) => void
  onSelectionChange?: (range: Range, oldRange: Range, source: EmitterSource) => void
}

const cleanHtmlContent = (html: string): string => DOMPurify.sanitize(html.replace(/&nbsp;/g, ' '))

const TextEditor = ({
  readOnly,
  defaultValue,
  onChange,
  onTextChange,
  onSelectionChange,
}: TextEditorProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const quillRef = useRef<Quill | null>(null)
  const defaultValueRef = useRef(defaultValue)
  const onChangeRef = useRef(onChange)
  const onTextChangeRef = useRef(onTextChange)
  const onSelectionChangeRef = useRef(onSelectionChange)
  const isUserInputRef = useRef(false)

  useLayoutEffect(() => {
    onTextChangeRef.current = onTextChange
    onSelectionChangeRef.current = onSelectionChange
  })

  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(!readOnly)
    }
  }, [readOnly])

  useEffect(() => {
    defaultValueRef.current = defaultValue
  }, [defaultValue])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const editorContainer = container.appendChild(container.ownerDocument.createElement('div'))
    const quill = new Quill(editorContainer, {
      theme: 'snow',
      modules: {
        toolbar: [
          ['bold', 'italic'],
          ['link', 'image'],
          ['blockquote', 'code-block'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          // [{ header: [1, 2, 3, 4, 5, 6, false] }], // CSS FIX NEEDED
          ['clean'],
        ],
      },
    })

    quillRef.current = quill

    // Set initial content if we have it
    if (defaultValueRef.current) {
      const convertedContent = quill.clipboard.convert({
        html: cleanHtmlContent(defaultValueRef.current),
      })
      quill.setContents(convertedContent)
    }

    quill.on(Quill.events.TEXT_CHANGE, (...args) => {
      isUserInputRef.current = true
      onTextChangeRef.current?.(...args)
      const html = quill.getSemanticHTML()
      onChangeRef.current?.(cleanHtmlContent(html))
    })

    quill.on(Quill.events.SELECTION_CHANGE, (...args) => {
      onSelectionChangeRef.current?.(...args)
    })

    return () => {
      quillRef.current = null
      container.innerHTML = ''
    }
  }, [])

  // Separate effect to handle content updates
  useEffect(() => {
    if (quillRef.current && defaultValue !== undefined && !isUserInputRef.current) {
      const quill = quillRef.current
      const currentContent = quill.getContents()
      const newContent = quill.clipboard.convert({
        html: defaultValue ? cleanHtmlContent(defaultValue) : '',
      })

      if (defaultValue && JSON.stringify(currentContent) !== JSON.stringify(newContent)) {
        quill.setContents(newContent)
      }
    }
    isUserInputRef.current = false
  }, [defaultValue])

  return <div ref={containerRef} className="editor-container"></div>
}

export default TextEditor
