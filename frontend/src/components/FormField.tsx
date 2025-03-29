import { ReactNode } from 'react'

interface FormFieldProps {
  label?: string | ReactNode
  error?: string
  children: ReactNode
}

export const FormField = ({ label, error, children }: FormFieldProps) => {
  return (
    <div className="mb-4">
      {label && <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>}
      {children}
      {error && <div className="mt-1 text-sm text-red-500">{error}</div>}
    </div>
  )
}
