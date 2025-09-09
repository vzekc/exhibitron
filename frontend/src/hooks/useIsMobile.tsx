import { useState, useEffect } from 'react'

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      // Check both screen width and user agent for better mobile detection
      const screenWidth = window.innerWidth
      const userAgent = navigator.userAgent || navigator.vendor || ''
      const isMobileDevice = /android|ipad|iphone|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase(),
      )
      const isSmallScreen = screenWidth < 768 // md breakpoint in Tailwind

      setIsMobile(isMobileDevice || isSmallScreen)
    }

    // Check initially
    checkIsMobile()

    // Listen for resize events
    window.addEventListener('resize', checkIsMobile)

    return () => {
      window.removeEventListener('resize', checkIsMobile)
    }
  }, [])

  return isMobile
}
