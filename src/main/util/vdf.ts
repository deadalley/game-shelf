/**
 * Parser for Valve's text KeyValues format (.vdf / .acf).
 * Returns nested plain objects; all leaf values are strings.
 */
export type VdfNode = { [key: string]: string | VdfNode }

export function parseVdf(text: string): VdfNode {
  let i = 0
  const n = text.length

  const skipWs = (): void => {
    while (i < n) {
      const c = text[i]
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '﻿') {
        i++
      } else if (c === '/' && text[i + 1] === '/') {
        while (i < n && text[i] !== '\n') i++
      } else {
        break
      }
    }
  }

  const readToken = (): string | null => {
    skipWs()
    if (i >= n) return null
    const c = text[i]
    if (c === '{' || c === '}') {
      i++
      return c
    }
    if (c === '"') {
      i++
      let out = ''
      while (i < n && text[i] !== '"') {
        if (text[i] === '\\' && i + 1 < n) {
          const e = text[i + 1]
          out += e === 'n' ? '\n' : e === 't' ? '\t' : e
          i += 2
        } else {
          out += text[i++]
        }
      }
      i++ // closing quote
      return out
    }
    // Unquoted token
    let out = ''
    while (i < n && !/[\s{}"]/.test(text[i])) out += text[i++]
    return out
  }

  const readObject = (): VdfNode => {
    const obj: VdfNode = {}
    for (;;) {
      const key = readToken()
      if (key === null || key === '}') return obj
      const value = readToken()
      if (value === null) return obj
      if (value === '{') {
        obj[key] = readObject()
      } else {
        obj[key] = value
      }
      // Skip conditional suffixes like [$WIN32]
      skipWs()
      if (text[i] === '[') {
        while (i < n && text[i] !== ']') i++
        i++
      }
    }
  }

  return readObject()
}

/** Case-insensitive child lookup, since Steam is inconsistent about key casing. */
export function vget(node: VdfNode | string | undefined, ...path: string[]): VdfNode | string | undefined {
  let cur: VdfNode | string | undefined = node
  for (const key of path) {
    if (!cur || typeof cur === 'string') return undefined
    const lower = key.toLowerCase()
    const match: string | undefined = Object.keys(cur).find((k) => k.toLowerCase() === lower)
    cur = match === undefined ? undefined : cur[match]
  }
  return cur
}

export function vobj(node: VdfNode | string | undefined, ...path: string[]): VdfNode | undefined {
  const v = vget(node, ...path)
  return v && typeof v === 'object' ? v : undefined
}

export function vstr(node: VdfNode | string | undefined, ...path: string[]): string | undefined {
  const v = vget(node, ...path)
  return typeof v === 'string' ? v : undefined
}
