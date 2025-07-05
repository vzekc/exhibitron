import { forwardRef } from 'react'

// Common input styles used across forms
const inputStyles =
  'mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400'

// Common section styles
const sectionStyles = 'rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm'

interface FormSectionProps {
  children: React.ReactNode
  className?: string
}

export const FormSection = ({ children, className = '' }: FormSectionProps) => (
  <div className={`${sectionStyles} ${className}`}>{children}</div>
)

interface FormFieldGroupProps {
  children: React.ReactNode
  className?: string
}

export const FormFieldGroup = ({ children, className = '' }: FormFieldGroupProps) => (
  <div className={`space-y-4 ${className}`}>{children}</div>
)

interface FormLabelProps {
  htmlFor?: string
  children: React.ReactNode
}

export const FormLabel = ({ htmlFor, children }: FormLabelProps) => (
  <label htmlFor={htmlFor} className="block">
    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">{children}</span>
  </label>
)

interface SectionLabelProps {
  htmlFor?: string
  children: React.ReactNode
}

export const SectionLabel = ({ htmlFor, children }: SectionLabelProps) => (
  <label
    htmlFor={htmlFor}
    className="mb-3 block text-2xl font-bold text-gray-800 dark:text-gray-100">
    {children}
  </label>
)

interface FormErrorProps {
  children: React.ReactNode
}

export const FormError = ({ children }: FormErrorProps) => (
  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{children}</p>
)

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = '', ...props }, ref) => (
    <div>
      <input ref={ref} className={`${inputStyles} ${className}`} {...props} />
      {error && <FormError>{error}</FormError>}
    </div>
  ),
)

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ error, className = '', ...props }, ref) => (
    <div>
      <textarea ref={ref} className={`${inputStyles} ${className}`} {...props} />
      {error && <FormError>{error}</FormError>}
    </div>
  ),
)

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ error, label, className = '', ...props }, ref) => (
    <div className="flex items-center">
      <input
        ref={ref}
        type="checkbox"
        className={`h-4 w-4 rounded border-gray-300 bg-gray-50 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-blue-400 dark:focus:ring-blue-400 ${className}`}
        {...props}
      />
      {label && (
        <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">{label}</label>
      )}
      {error && <FormError>{error}</FormError>}
    </div>
  ),
)

Input.displayName = 'Input'
TextArea.displayName = 'TextArea'
Checkbox.displayName = 'Checkbox'
