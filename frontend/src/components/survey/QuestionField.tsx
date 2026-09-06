import FormInput from '@components/FormInput'
import { AnswerValue, Question } from './answers'

interface QuestionFieldProps {
  question: Question
  value: AnswerValue | undefined
  onChange: (value: AnswerValue | undefined) => void
  error?: string
}

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{children}</p>
)

/*
 * One question as a form control, in the shape its type asks for. A closed
 * question is shown but cannot be changed, and says so.
 */
const QuestionField = ({ question, value, onChange, error }: QuestionFieldProps) => {
  const disabled = question.isClosed
  const name = `question-${question.id}`
  const title = (
    <span className="font-medium text-gray-700 dark:text-gray-300">
      {question.label}
      {question.required && question.type !== 'checkbox' && (
        <span className="ml-1 text-red-500" title="Pflichtfrage">
          *
        </span>
      )}
    </span>
  )

  const control = () => {
    switch (question.type) {
      case 'checkbox':
        return (
          <label className="flex cursor-pointer items-center">
            <FormInput
              type="checkbox"
              className="mr-2"
              checked={value === true}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked)}
            />
            {title}
          </label>
        )
      case 'singleChoice':
        return (
          <>
            {title}
            <div className="ml-6 mt-1 space-y-1">
              {question.options.map((option) => (
                <label key={option.key} className="flex cursor-pointer items-center">
                  <input
                    type="radio"
                    name={name}
                    className="mr-2 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                    checked={value === option.key}
                    disabled={disabled}
                    onChange={() => onChange(option.key)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {!question.required && !disabled && value !== undefined && (
              <button
                type="button"
                className="mt-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
                onClick={() => onChange(undefined)}>
                Auswahl zurücknehmen
              </button>
            )}
          </>
        )
      case 'multipleChoice': {
        const chosen = Array.isArray(value) ? value : []
        return (
          <>
            {title}
            <div className="ml-6 mt-1 space-y-1">
              {question.options.map((option) => (
                <label key={option.key} className="flex cursor-pointer items-center">
                  <FormInput
                    type="checkbox"
                    className="mr-2"
                    checked={chosen.includes(option.key)}
                    disabled={disabled}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...chosen, option.key]
                        : chosen.filter((key) => key !== option.key)
                      onChange(next.length ? next : undefined)
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </>
        )
      }
      case 'text':
        return (
          <label className="block">
            {title}
            <FormInput
              type="text"
              className="mt-1"
              value={typeof value === 'string' ? value : ''}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value || undefined)}
            />
          </label>
        )
      case 'number':
        return (
          <label className="block">
            {title}
            <FormInput
              type="number"
              min={0}
              step={1}
              className="mt-1 w-32"
              value={typeof value === 'number' ? value : ''}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </label>
        )
    }
  }

  /* Each question is a small card; a dependent one stands indented under
     the one it waits for. */
  const card =
    'rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800'
  const indent = question.showIfQuestion ? 'ml-6' : ''

  return (
    <div className={`${card} ${indent} ${disabled ? 'opacity-70' : ''}`}>
      {control()}
      {question.description && <Hint>{question.description}</Hint>}
      {disabled && <Hint>Diese Frage kann nicht mehr beantwortet werden.</Hint>}
      {error && <div className="mt-1 text-sm text-red-500">{error}</div>}
    </div>
  )
}

export default QuestionField
