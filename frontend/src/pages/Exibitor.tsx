import { useLocation, useParams } from 'react-router-dom'
import { useBreadcrumb } from '../contexts/BreadcrumbContext.ts'
import ExhibitorDetails from '../components/ExhibitorDetails.tsx'

const Exhibitor = () => {
  const { id } = useParams<{ id: string }>()
  const { setDetailName } = useBreadcrumb()
  const location = useLocation()

  if (id) {
    return (
      <ExhibitorDetails
        id={+id}
        onLoaded={(exhibitor) =>
          setDetailName(location.pathname, exhibitor.fullName)
        }
      />
    )
  }
}

export default Exhibitor
