/** Splits a command-line argument string, honouring double quotes (also mid-token, as in `/path="C:\a b"`). */
export function splitArgs(args: string | undefined): string[] {
  if (!args) return []
  const out: string[] = []
  let cur = ''
  let quoted = false
  let has = false
  for (const ch of args) {
    if (ch === '"') {
      quoted = !quoted
      has = true
    } else if (/\s/.test(ch) && !quoted) {
      if (has) out.push(cur)
      cur = ''
      has = false
    } else {
      cur += ch
      has = true
    }
  }
  if (has) out.push(cur)
  return out
}
