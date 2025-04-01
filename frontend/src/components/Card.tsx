import React from 'react'
import { Link } from 'react-router-dom'

interface CardProps {
  children: React.ReactNode
  to?: string
  className?: string
}

const Card = ({ children, to, className = '' }: CardProps) => (
  <div className={`rounded-lg bg-white p-4 shadow-md dark:bg-gray-800 ${className}`}>
    {to ? (
      <Link to={to} className="block h-full w-full">
        {children}
      </Link>
    ) : (
      <> {children} </>
    )}
  </div>
)

export default Card
