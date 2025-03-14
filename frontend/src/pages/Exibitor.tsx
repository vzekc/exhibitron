import { useLocation, useParams } from 'react-router-dom'
import { useBreadcrumb } from '../contexts/BreadcrumbContext.ts'
import ExhibitorDetails from '../components/ExhibitorDetails.tsx'
import { useCallback } from 'react'

const Exhibitor = () => {
  const { id } = useParams<{ id: string }>()
  const { setDetailName } = useBreadcrumb()
  const location = useLocation()

  const handleLoaded = useCallback(
    (exhibitor: { fullName: string }) => {
      setDetailName(location.pathname, exhibitor.fullName)
    },
    [location.pathname, setDetailName],
  )

  if (id) {
    return <ExhibitorDetails id={+id} onLoaded={handleLoaded} />
  }
}

export default Exhibitor
