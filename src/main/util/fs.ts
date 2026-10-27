import { promises as fs } from 'node:fs'
import { join } from 'node:path'

export async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function readText(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, 'utf8')
  } catch {
    return null
  }
}

export async function listDir(p: string): Promise<string[]> {
  try {
    return await fs.readdir(p)
  } catch {
    return []
  }
}

export async function statTime(p: string): Promise<number | undefined> {
  try {
    const s = await fs.stat(p)
    // birthtime is 0 on some filesystems
    return s.birthtimeMs > 0 ? s.birthtimeMs : s.mtimeMs
  } catch {
    return undefined
  }
}

const IMAGE_EXT = /\.(jpe?g|png|webp|svg)$/i

/** Finds the first file in `dir` (recursively, shallow depth) whose name matches `pattern`. */
export async function findFile(dir: string, pattern: RegExp, depth = 2): Promise<string | undefined> {
  const entries = await listDir(dir)
  for (const e of entries) {
    if (pattern.test(e) && IMAGE_EXT.test(e)) return join(dir, e)
  }
  if (depth <= 0) return undefined
  for (const e of entries) {
    const sub = join(dir, e)
    try {
      if ((await fs.stat(sub)).isDirectory()) {
        const hit = await findFile(sub, pattern, depth - 1)
        if (hit) return hit
      }
    } catch {
      // ignore unreadable entries
    }
  }
  return undefined
}

/** Run `fn` over `items` with at most `limit` in flight. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const idx = next++
      results[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
