import { ReactNode } from 'react'
import { convert } from 'html-to-text'
import ReactDOMServer from 'react-dom/server'

export const htmlToText = (html: string) => {
  return convert(html, {
    selectors: [{ selector: 'img', format: 'skip' }],
  })
}

export const makeEmailBody = (element: ReactNode) => {
  const html = ReactDOMServer.renderToStaticMarkup(element)
  const text = htmlToText(html)
  return { html, text }
}
