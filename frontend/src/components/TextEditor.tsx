import Quill, { Delta } from 'quill'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react'
import deepEqual from 'fast-deep-equal'
import 'quill/dist/quill.snow.css'
import './TextEditor.css'

interface TextEditorProps {
  defaultValue?: string
  onEditStateChange?: (isEdited: boolean) => void
}

export interface TextEditorHandle {
  getHTML: () => string
}

const TextEditor = forwardRef<TextEditorHandle, TextEditorProps>(
  ({ defaultValue, onEditStateChange }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const quillRef = useRef<Quill | null>(null)
    const defaultValueRef = useRef(defaultValue)
    const onEditStateChangeRef = useRef(onEditStateChange)
    const isUserInputRef = useRef(false)
    const initialDeltaRef = useRef<Delta | null>(null)
    const [isEdited, setIsEdited] = useState(false)

    useImperativeHandle(
      ref,
      () => ({
        getHTML: () => {
          if (!quillRef.current) return ''
          return quillRef.current.getSemanticHTML().replaceAll(/&nbsp;/g, ' ')
        },
      }),
      [],
    )

    useLayoutEffect(() => {
      onEditStateChangeRef.current = onEditStateChange
    })

    useEffect(() => {
      defaultValueRef.current = defaultValue
    }, [defaultValue])

    useEffect(() => {
      onEditStateChangeRef.current?.(isEdited)
    }, [isEdited])

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
            ['clean'],
          ],
        },
      })

      quillRef.current = quill

      // Set initial content and store initial delta
      if (defaultValueRef.current) {
        const convertedContent = quill.clipboard.convert({
          html: defaultValueRef.current,
        })
        quill.setContents(convertedContent)
        initialDeltaRef.current = quill.getContents()
      } else {
        initialDeltaRef.current = quill.getContents()
      }

      quill.on(Quill.events.TEXT_CHANGE, () => {
        isUserInputRef.current = true

        const currentDelta = quill.getContents()
        const hasChanges = !deepEqual(currentDelta, initialDeltaRef.current)
        setIsEdited(hasChanges)
      })

      return () => {
        quillRef.current = null
        container.innerHTML = ''
      }
    }, [])

    // Separate effect to handle content updates from parent
    useEffect(() => {
      if (quillRef.current && defaultValue !== undefined && !isUserInputRef.current) {
        const quill = quillRef.current
        const newContent = quill.clipboard.convert({
          html: defaultValue || '',
        })

        quill.setContents(newContent)
        initialDeltaRef.current = quill.getContents()
        setIsEdited(false)
      }
      isUserInputRef.current = false
    }, [defaultValue])

    return <div ref={containerRef} className="editor-container"></div>
  },
)

TextEditor.displayName = 'TextEditor'

export default TextEditor
