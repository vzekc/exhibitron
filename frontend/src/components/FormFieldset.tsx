import React from 'react'

interface FormFieldsetProps {
  legend: string
  children: React.ReactNode
}

const FormFieldset: React.FC<FormFieldsetProps> = ({ legend, children }) => {
  return (
    <fieldset className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <legend className="text-md px-2 font-medium font-semibold text-gray-700 dark:text-gray-300">
        {legend}
      </legend>
      {children}
    </fieldset>
  )
}

export default FormFieldset
