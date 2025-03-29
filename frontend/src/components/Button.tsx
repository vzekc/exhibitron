import { ButtonHTMLAttributes } from 'react'
import Icon from './Icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  children: React.ReactNode
  icon?: string
}

const Button = ({
  variant = 'primary',
  children,
  className = '',
  disabled,
  icon,
  ...props
}: ButtonProps) => {
  const baseStyles = 'rounded px-4 py-2 text-white transition-colors inline-flex items-center gap-2'

  const variantStyles = {
    primary: disabled ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-600/80 hover:bg-blue-600',
    secondary: disabled ? 'cursor-not-allowed bg-gray-400' : 'bg-teal-600/80 hover:bg-teal-600',
    danger: disabled ? 'cursor-not-allowed bg-gray-400' : 'bg-red-600/80 hover:bg-red-600',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}>
      {icon && <Icon name={icon} color="white" />}
      {children}
    </button>
  )
}

export default Button
