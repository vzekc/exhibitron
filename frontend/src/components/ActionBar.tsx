import React, { useEffect, useRef, useState } from 'react'

interface ActionBarProps {
  children: React.ReactNode
  className?: string
}

interface ButtonProps {
  variant?: 'danger' | 'default'
  children?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

const ActionBar = ({ children, className = '' }: ActionBarProps) => {
  const [showFloatingButtons, setShowFloatingButtons] = useState(false)
  const buttonContainerRef = useRef<HTMLDivElement>(null)
  const floatingButtonsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!buttonContainerRef.current) return

      const rect = buttonContainerRef.current.getBoundingClientRect()
      const isOutOfView = rect.bottom <= 0 || rect.top >= window.innerHeight

      // Only update state if there's a change to avoid unnecessary re-renders
      if (showFloatingButtons !== isOutOfView) {
        setShowFloatingButtons(isOutOfView)
      }
    }

    // Check initially and whenever window size changes
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [showFloatingButtons])

  const renderButtons = () => {
    const buttons = React.Children.toArray(children)
    const regularButtons = buttons.filter(
      (child): child is React.ReactElement<ButtonProps> =>
        React.isValidElement<ButtonProps>(child) && child.props.variant !== 'danger',
    )
    const dangerButtons = buttons.filter(
      (child): child is React.ReactElement<ButtonProps> =>
        React.isValidElement<ButtonProps>(child) && child.props.variant === 'danger',
    )

    return (
      <div className="flex items-center justify-between">
        <div className="flex gap-2">{regularButtons}</div>
        <div className="flex gap-2">{dangerButtons}</div>
      </div>
    )
  }

  return (
    <>
      <div
        className={`sticky bottom-0 mt-8 border-t border-gray-200 bg-white/95 p-4 pt-4 shadow-sm backdrop-blur-sm ${className}`}
        ref={buttonContainerRef}>
        {renderButtons()}
      </div>

      {showFloatingButtons && (
        <div
          ref={floatingButtonsRef}
          className="fixed bottom-4 right-4 z-50 flex gap-2 rounded-lg bg-white/95 p-4 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm transition-all duration-300 ease-in-out">
          {renderButtons()}
        </div>
      )}
    </>
  )
}

export default ActionBar
