import React from 'react'

interface PageHeadingProps {
  children: React.ReactNode
}

const PageHeading: React.FC<PageHeadingProps> = ({ children }) => {
  return <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100">{children}</h1>
}

export default PageHeading
