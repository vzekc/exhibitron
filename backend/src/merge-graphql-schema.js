import { mergeTypeDefs } from '@graphql-tools/merge'
import { loadFilesSync } from '@graphql-tools/load-files'
import { writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { print } from 'graphql'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const typesArray = loadFilesSync(path.join(__dirname, './**/*.graphql'))
const mergedTypeDefs = mergeTypeDefs(typesArray)

writeFileSync(
  path.join(__dirname, './generated/merged-schema.txt'),
  print(mergedTypeDefs),
)
