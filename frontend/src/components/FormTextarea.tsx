import { TextareaHTMLAttributes } from 'react'

type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

const FormTextarea = ({ className = '', ...props }: FormTextareaProps) => {
  return (
    <textarea
      className={`w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 ${className}`}
      {...props}
    />
  )
}

export default FormTextarea
