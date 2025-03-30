import React from 'react'

interface CardContainerProps {
  children: React.ReactNode
}

const ChipContainer = ({ children }: CardContainerProps) => {
  return <div className="flex flex-wrap justify-center gap-4">{children}</div>
}

export default ChipContainer
