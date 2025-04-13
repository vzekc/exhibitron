import { marked } from 'marked'
import fs from 'fs/promises'
import path from 'path'

interface Doc {
  id: string
  name: string
  content: string
}

export class DocService {
  private docsDir: string

  constructor() {
    this.docsDir = path.join(process.cwd(), 'docs')
  }

  async getDoc(name: string): Promise<Doc | null> {
    try {
      const filePath = path.join(this.docsDir, `${name}.md`)
      const content = await fs.readFile(filePath, 'utf-8')
      const htmlContent = await marked(content)

      return {
        id: name,
        name,
        content: htmlContent,
      }
    } catch (error) {
      console.error(`Error reading doc ${name}:`, error)
      return null
    }
  }
}
