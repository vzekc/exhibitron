import path from 'path'
import fs from 'fs'

export const resolvePath = (...components: string[]) =>
  path.join(__dirname, '../..', ...components)

export const readFileSync = (...components: string[]) =>
  fs.readFileSync(resolvePath(...components), { encoding: 'utf8' })
