import { SelectHTMLAttributes } from 'react'

type FormSelectProps = SelectHTMLAttributes<HTMLSelectElement>

const FormSelect = ({ className = '', ...props }: FormSelectProps) => {
  return (
    <select
      className={`w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...props}
    />
  )
}

export default FormSelect
