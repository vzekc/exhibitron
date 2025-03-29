import React from 'react'
import Card from '@components/Card.tsx'

interface ArticleProps {
  children: React.ReactNode
  className?: string
}

const Article = ({ children, className = '' }: ArticleProps) => {
  return <Card className={`mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</Card>
}

export default Article
