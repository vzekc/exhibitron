import { useLocation } from 'react-router-dom'

const NotFound = () => {
  const location = useLocation()
  return (
    <article>
      <code>
        %EXHIBITRON-W-SEARCHFAIL, error searching for {window.location.origin}
        {location.pathname}
        <br />
        -RMS-E-FNF, file not found
      </code>
    </article>
  )
}

export default NotFound
