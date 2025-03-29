import { ReactNode } from 'react'

interface FormFieldsetProps {
  title?: string
  children: ReactNode
}

export const FormFieldset = ({ title, children }: FormFieldsetProps) => {
  return (
    <fieldset className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
      <div className="space-y-4">{children}</div>
    </fieldset>
  )
}
