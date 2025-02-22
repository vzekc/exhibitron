import type { FC } from 'react'

import { Crepe } from '@milkdown/crepe'
import { Milkdown, useEditor } from '@milkdown/react'

import '@milkdown/crepe/theme/common/style.css'

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
        featureConfigs: {
          [Crepe.Feature.Placeholder]: {
            text: 'Text eingeben...',
            mode: 'doc',
          },
        },
      })
      crepe.setReadonly(readonly)
      return crepe
    },
    [readonly],
  )

  return <Milkdown />
}
