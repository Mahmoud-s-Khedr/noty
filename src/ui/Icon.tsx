const PATHS = {
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  x: 'M6 6l12 12M18 6 6 18',
  back: 'M15 5l-7 7 7 7',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  upload: 'M12 16V5m0 0L8 9m4-4 4 4M5 20h14',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10 11v5M14 11v5',
  bold: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',
  italic: 'M14 5h-4m4 0-4 14m0 0H6m4 0h4',
  strike: 'M5 12h14M16.5 7.5C16 6 14.5 5 12.5 5 10 5 8.5 6.2 8.5 8c0 1.2.7 2 2 2.6M7.5 16.5C8 18 9.5 19 11.5 19c2.5 0 4-1.2 4-3 0-.8-.3-1.5-1-2',
  code: 'm9 8-4 4 4 4m6-8 4 4-4 4',
  h2: 'M4 5v14M4 12h8m0-7v14M16 10a2.5 2.5 0 0 1 4.5 1.5c0 2-4.5 4-4.5 6.5h5',
  h3: 'M4 5v14M4 12h8m0-7v14M16 9h4l-2.5 3.5a2.5 2.5 0 1 1-1.5 4.5',
  ul: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  ol: 'M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M4 14.5c.5-1 2.5-1 2.5.5S4 16.5 4 18h3',
  quote: 'M6 17c-1.5-1-2-2.5-2-4.5C4 9 6 7 9 6.5M15 17c-1.5-1-2-2.5-2-4.5 0-3.5 2-5.5 5-6',
  codeblock: 'M4 5h16v14H4zM9.5 10 7.5 12l2 2m5-4 2 2-2 2',
  image: 'M4 5h16v14H4zM4 16l4.5-4.5L13 16l3-3 4 4M15.5 9.5h.01',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  collapse: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  redo: 'm15 14 5-5-5-5m5 5H10a6 6 0 0 0 0 12h3',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}

export function Logo() {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="104" fill="#16202C" />
      <rect x="116" y="146" width="236" height="62" rx="12" fill="#FFE45C" />
      <rect x="136" y="162" width="236" height="30" rx="15" fill="#F4F6F8" />
      <rect x="136" y="241" width="240" height="30" rx="15" fill="#F4F6F8" />
      <rect x="136" y="320" width="150" height="30" rx="15" fill="#F4F6F8" />
    </svg>
  )
}
