import React from 'react'

interface CardContainerProps {
  children: React.ReactNode
}

const ChipContainer = ({ children }: CardContainerProps) => {
  return <div className="flex flex-wrap justify-start gap-4 overflow-hidden">{children}</div>
}

export default ChipContainer
