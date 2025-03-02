import { ReactNode } from 'react'
import { convert } from 'html-to-text'
import ReactDOMServer from 'react-dom/server'

export const makeEmailBody = (element: ReactNode) => {
  const html = ReactDOMServer.renderToStaticMarkup(element)
  const text = convert(html)
  return { html, text }
}
