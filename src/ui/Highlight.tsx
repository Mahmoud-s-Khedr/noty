/** Wraps case-insensitive matches of `term` in a highlighter swipe. */
export function Highlight({ text, term }: { text: string; term: string }) {
  const t = term.trim()
  if (!t) return <>{text}</>
  const lower = text.toLowerCase()
  const needle = t.toLowerCase()
  const parts: React.ReactNode[] = []
  let from = 0
  for (let i = lower.indexOf(needle); i >= 0; i = lower.indexOf(needle, from)) {
    if (i > from) parts.push(text.slice(from, i))
    parts.push(<mark key={i}>{text.slice(i, i + needle.length)}</mark>)
    from = i + needle.length
  }
  parts.push(text.slice(from))
  return <>{parts}</>
}
