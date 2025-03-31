import React, { useEffect, useRef, useState } from 'react'

interface CardContainerProps {
  children: React.ReactNode
}

const ChipContainer = ({ children }: CardContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [marginLeft, setMarginLeft] = useState(0)

  // In order to center the content, we need to calculate the width of the first row and
  // set the left margin based on that width.  I could not achieve the same result
  // (justify-start with the container centered) with CSS alone.
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const children = container.children
    if (children.length === 0) return

    // Get the first child's position and width
    const firstChild = children[0]
    const firstChildRect = firstChild.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    // Calculate the width of the first row by finding the last element in the first row
    let lastElementRight = firstChildRect.right

    for (let i = 1; i < children.length; i++) {
      const child = children[i]
      const childRect = child.getBoundingClientRect()

      // If this element starts at a higher position than the first child, we've moved to the next row
      if (childRect.top > firstChildRect.top) break

      lastElementRight = childRect.right
    }

    // Calculate the required margin to center the content
    const contentWidth = lastElementRight - firstChildRect.left
    const margin = (containerRect.width - contentWidth) / 2

    setMarginLeft(margin)
  }, [children]) // Only recalculate when children change

  return (
    <div
      ref={containerRef}
      className="flex flex-wrap justify-start gap-4 overflow-hidden"
      style={{ marginLeft: `${marginLeft}px` }}>
      {children}
    </div>
  )
}

export default ChipContainer
