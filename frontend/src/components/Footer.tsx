import { useExhibition } from '@contexts/ExhibitionContext.ts'

const Footer = () => {
  const { exhibition } = useExhibition()
  const title = exhibition?.title ?? 'Classic Computing'

  return (
    <footer className="mx-4 my-8 border-t border-gray-200 pt-8">
      <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
        <p className="text-sm text-gray-600">
          Die {title} ist eine Veranstaltung des{' '}
          <a
            href="https://vzekc.de"
            target="_blank"
            rel="noreferrer nofollow"
            className="text-blue-600 hover:text-blue-800">
            VzEkC e.V.
          </a>
        </p>
        <div className="text-sm text-gray-600">
          <a
            href="https://classic-computing.de/impressum"
            target="_blank"
            rel="noreferrer nofollow"
            className="text-blue-600 hover:text-blue-800">
            Impressum
          </a>{' '}
          |{' '}
          <a
            href="https://forum.classic-computing.de/index.php?datenschutzerklaerung/"
            target="_blank"
            rel="noreferrer nofollow"
            className="text-blue-600 hover:text-blue-800">
            Datenschutz
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
