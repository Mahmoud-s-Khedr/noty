import { Extension } from '@tiptap/core'

// Let the browser's Unicode bidi algorithm choose each block's base direction
// from its first strong character (ignoring leading numbers and punctuation).
// Defaults also apply to existing notes without rewriting their saved content.
export const TextDirection = Extension.create({
  name: 'automaticTextDirection',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'tableCell', 'tableHeader'],
        attributes: {
          dir: {
            default: 'auto',
            parseHTML: (element) => {
              const dir = element.getAttribute('dir')
              return dir === 'rtl' || dir === 'ltr' ? dir : 'auto'
            },
          },
        },
      },
      {
        types: ['codeBlock'],
        attributes: { dir: { default: 'ltr', renderHTML: () => ({ dir: 'ltr' }) } },
      },
    ]
  },
})
