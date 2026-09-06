import { Link, useLocation } from 'react-router-dom'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'

/*
 * A line under the navigation while an exhibitor still owes the organisation
 * an answer. It stays away from the page it points to.
 */
const SurveyReminder = () => {
  const { exhibitor } = useExhibitor()
  const { pathname } = useLocation()
  const open = exhibitor?.unansweredRequiredSurveyQuestions ?? 0
  if (!open || pathname.startsWith('/user/umfrage')) return null

  return (
    <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
      Die Orga hat {open === 1 ? 'eine Frage' : `${open} Fragen`} an dich, die noch offen{' '}
      {open === 1 ? 'ist' : 'sind'}.{' '}
      <Link to="/user/umfrage" className="font-medium underline">
        Jetzt beantworten
      </Link>
    </div>
  )
}

export default SurveyReminder
