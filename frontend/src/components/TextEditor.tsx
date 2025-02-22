import type { FC } from 'react'

import { Crepe } from '@milkdown/crepe'
import { Milkdown, useEditor } from '@milkdown/react'

import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

interface TextEditorProps {
  markdown: string
  readonly?: boolean
}

export const TextEditor: FC<TextEditorProps> = ({
  markdown,
  readonly = false,
}) => {
  useEditor(
    (root) => {
      const crepe = new Crepe({
        root,
        defaultValue: markdown,
      })
      crepe.setReadonly(readonly)
      return crepe
    },
    [readonly],
  )

  return <Milkdown />
}
