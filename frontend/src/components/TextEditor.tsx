import Quill, { Delta } from 'quill'
import QuillResizeImage from 'quill-resize-image'
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

// Register the resize module once outside the component
Quill.register('modules/resize', QuillResizeImage)

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

          // Get the HTML content
          const html = quillRef.current.getSemanticHTML().replaceAll(/&nbsp;/g, ' ')

          // Create a temporary div to parse the HTML
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = html

          // Find all images in the editor content
          const images = tempDiv.querySelectorAll('img')

          // For each image, get the actual dimensions from the DOM and set them as attributes
          images.forEach((img) => {
            // Find the corresponding image in the editor and cast it to HTMLImageElement
            const editorImgElement = quillRef.current?.root.querySelector(
              `img[src="${img.getAttribute('src')}"]`,
            )
            if (editorImgElement) {
              const editorImg = editorImgElement as HTMLImageElement
              // Copy the width and height from the actual rendered image
              if (editorImg.style.width) {
                img.setAttribute('width', editorImg.style.width)
              }
              if (editorImg.style.height) {
                img.setAttribute('height', editorImg.style.height)
              }
              // Copy alignment class if present
              if (editorImg.className) {
                img.className = editorImg.className
              }
            }
          })

          return tempDiv.innerHTML
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
          resize: {
            options: {
              onChange: () => console.log('image changed'),
            },
            // Use default configuration
          },
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

      // Listen for image resize events
      const handleImageResize = () => {
        // Trigger a text change event to mark content as edited
        isUserInputRef.current = true
        setIsEdited(true)
      }

      // Add event listener for image resize
      container.addEventListener('quill-resize-image', handleImageResize)

      return () => {
        // Remove event listener
        container.removeEventListener('quill-resize-image', handleImageResize)
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
