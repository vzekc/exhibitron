import type { FC } from 'react'

import { Crepe } from '@milkdown/crepe'
import { Milkdown, useEditor } from '@milkdown/react'

import '@milkdown/crepe/theme/common/style.css'

interface TextEditorProps {
  markdown: string
  readonly?: boolean
  onChange?: (markdown: string, prevMarkdown: string) => void
}

export const TextEditor: FC<TextEditorProps> = ({
  markdown,
  readonly = false,
  onChange,
}) => {
  useEditor(
    (root) => {
      const crepe = new Crepe({
        root,
        defaultValue: markdown,
        featureConfigs: {
          [Crepe.Feature.Placeholder]: {
            text: 'Text eingeben...',
            mode: 'doc',
          },
        },
      })
      if (onChange) {
        crepe.on((listener) => {
          listener.markdownUpdated((_, markdown, prevMarkdown) =>
            onChange(markdown, prevMarkdown),
          )
        })
      }
      crepe.setReadonly(readonly)
      return crepe
    },
    [readonly],
  )

  return <Milkdown />
}
