import { InputHTMLAttributes } from 'react'

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'email' | 'checkbox' | 'number' | 'password'
}

export const FormInput = ({ type = 'text', className = '', ...props }: FormInputProps) => {
  const baseStyles =
    'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
  const checkboxStyles = 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'

  const styles = type === 'checkbox' ? checkboxStyles : baseStyles

  return <input type={type} className={`${styles} ${className}`} {...props} />
}
