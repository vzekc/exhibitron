import React from 'react'

interface IconProps {
  name: string
  alt?: string
  className?: string
  color?: 'white' | 'default'
}

const Icon: React.FC<IconProps> = ({ name, alt = '', className = '', color = 'default' }) => {
  // Generate the src path based on the icon name
  const src = `/${name}.svg`

  const colorStyles = color === 'white' ? 'brightness-0 invert' : ''

  return <img src={src} alt={alt} className={`h-[30px] w-[30px] ${colorStyles} ${className}`} />
}

export default Icon
