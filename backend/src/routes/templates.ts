import 'dotenv/config'

import fs from 'fs'
import * as Marked from 'marked'
import ejs from 'ejs'
import Koa from 'koa'
import Router from 'koa-router'

import { resolvePath, readFileSync } from "../paths"

const router = new Router();

const renderTemplate = (
  content: string,
  state: ejs.Data,
  data: ejs.Data = {}
) => ejs.render(content, { ...state, ...data })
const renderTemplateFile = (
  filename: string,
  state: ejs.Data,
  data: ejs.Data = {}
) => renderTemplate(readFileSync('templates', filename), state, data)

const markdownOptions = {
  renderer: new Marked.Renderer(),
  gfm: true,
  breaks: false,
}

router.get('/:page/:arg?', (ctx: Koa.Context, next: () => Promise<void>) => {
  if (ctx.params.page === 'auth') {
    return next()
  }

  let content = null
  if (fs.existsSync(resolvePath('templates', `${ctx.params.page}.md`))) {
    content = Marked.parse(
      renderTemplateFile(`${ctx.params.page}.md`, ctx.state),
      markdownOptions
    )
  } else if (
    fs.existsSync(resolvePath('templates', `${ctx.params.page}.html`))
  ) {
    content = renderTemplate(
      readFileSync('templates', `${ctx.params.page}.html`),
      ctx.state
    )
  }

  if (content) {
    // Send the HTML response
    ctx.type = 'text/html'
    ctx.body = renderTemplateFile('layout.ejs', ctx.state, {
      content,
      page_name: ctx.params.page,
    })
  } else {
    return next()
  }
})

export default router
