import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import LoadInProgress from './LoadInProgress'

interface ReactSVGProps {
  src: string
  className?: string
  onLoad?: (svg: SVGSVGElement) => void
  onClick?: (event: React.MouseEvent<SVGSVGElement>, id: string) => void
  onError?: (error: string) => void
}

export const ReactSVG: React.FC<ReactSVGProps> = ({
  src,
  className = '',
  onLoad,
  onClick,
  onError,
}) => {
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [parsedSvg, setParsedSvg] = useState<{
    element: SVGSVGElement | null
    attributes: Record<string, string>
    innerHTML: string
  } | null>(null)

  // Use useRef to store the onError callback to avoid dependency cycles
  const onErrorRef = useRef(onError)

  // Update the ref when the prop changes
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  // Report error both to state and through callback
  const reportError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    if (onErrorRef.current) {
      onErrorRef.current(errorMessage)
    }
  }, []) // No dependencies needed as we use the ref

  // Fetch SVG content using axios
  useEffect(() => {
    let isMounted = true
    const fetchSVG = async () => {
      try {
        const response = await axios.get(src, {
          responseType: 'text',
          headers: {
            Accept: 'image/svg+xml',
          },
        })

        const svgText = response.data

        // Quick validation to check if it contains an SVG tag
        if (!svgText.includes('<svg')) {
          throw new Error('The fetched content does not contain an SVG element')
        }

        if (isMounted) {
          setSvgContent(svgText)
        }
      } catch (err) {
        if (!isMounted) return

        let errorMessage = 'Failed to load SVG'

        if (axios.isAxiosError(err)) {
          errorMessage = `Failed to load SVG: ${err.message}`
          if (err.response) {
            errorMessage += ` (Status: ${err.response.status})`
          }
        } else if (err instanceof Error) {
          errorMessage = err.message
        }

        reportError(errorMessage)
      }
    }

    void fetchSVG()

    return () => {
      isMounted = false
    }
  }, [src, reportError])

  // Parse SVG content
  useEffect(() => {
    if (!svgContent) return

    let isMounted = true
    try {
      const div = document.createElement('div')
      div.innerHTML = svgContent.trim()

      // Get the SVG element - find it even if it's not the first child
      const svgElement = div.querySelector('svg')

      if (!svgElement) {
        reportError('Invalid SVG content: No SVG element found')
        return
      }

      // Extract SVG attributes
      const svgAttributes: Record<string, string> = {}
      Array.from(svgElement.attributes).forEach((attr) => {
        // Convert kebab-case attributes to camelCase for React
        const name = attr.name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
        svgAttributes[name] = attr.value
      })

      if (isMounted) {
        setParsedSvg({
          element: svgElement as SVGSVGElement,
          attributes: svgAttributes,
          innerHTML: svgElement.innerHTML,
        })
      }
    } catch (err) {
      if (!isMounted) return

      const errorMessage = `Error parsing SVG: ${err instanceof Error ? err.message : String(err)}`
      reportError(errorMessage)
    }

    return () => {
      isMounted = false
    }
  }, [svgContent, reportError])

  // Store onLoad in a ref to avoid dependency cycles
  const onLoadRef = useRef(onLoad)

  // Update the ref when the prop changes
  useEffect(() => {
    onLoadRef.current = onLoad
  }, [onLoad])

  // Call onLoad callback when SVG is parsed
  useEffect(() => {
    if (!parsedSvg?.element) return

    try {
      if (onLoadRef.current) {
        onLoadRef.current(parsedSvg.element)
      }
    } catch (err) {
      reportError(`Error in onLoad callback: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [parsedSvg, reportError])

  // Handle click events and delegate to the provided onClick handler
  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!onClick) return

    // Find the closest element with an id
    let target = event.target as Element
    while (target && !target.id && target !== event.currentTarget) {
      target = target.parentElement as Element
    }

    if (target && target.id) {
      onClick(event, target.id)
    }
  }

  if (error) {
    return <div className="svg-error">Error loading SVG: {error}</div>
  }

  if (!svgContent || !parsedSvg) {
    return <LoadInProgress />
  }

  // Create a React element from the SVG
  return (
    <svg
      {...parsedSvg.attributes}
      className={`react-svg ${className} ${parsedSvg.attributes.className || ''}`}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: parsedSvg.innerHTML }}
    />
  )
}

export default ReactSVG
