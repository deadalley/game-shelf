import { execFile } from 'node:child_process'

/** Values of one registry key, keyed by value name (case preserved). */
export type RegValues = Record<string, string>

export interface Registry {
  /** Values of a single key, or null if it doesn't exist. */
  read(key: string): Promise<RegValues | null>
  /** The key and every key below it, keyed by full path. */
  readTree(key: string): Promise<Map<string, RegValues>>
}

const HIVES: Record<string, string> = {
  HKLM: 'HKEY_LOCAL_MACHINE',
  HKCU: 'HKEY_CURRENT_USER'
}

export function normalizeKey(key: string): string {
  const [hive, ...rest] = key.split('\\')
  return [HIVES[hive.toUpperCase()] ?? hive.toUpperCase(), ...rest].join('\\')
}

const VALUE_LINE = /^\s{4}(.*?)\s{4}(REG_[A-Z_]+)\s{4}?(.*)$/

/** Parses the output of `reg query <key> /s`. */
export function parseRegOutput(output: string): Map<string, RegValues> {
  const result = new Map<string, RegValues>()
  let current: RegValues | null = null
  for (const raw of output.split(/\r?\n/)) {
    if (raw.startsWith('HKEY_')) {
      current = {}
      result.set(raw.trim(), current)
      continue
    }
    const m = VALUE_LINE.exec(raw)
    if (m && current) {
      const name = m[1] === '(Default)' ? '' : m[1]
      let value = m[3] ?? ''
      if (m[2] === 'REG_DWORD' || m[2] === 'REG_QWORD') value = String(parseInt(value, 16))
      current[name] = value
    }
  }
  return result
}

function regQuery(key: string, recursive: boolean): Promise<string> {
  const args = ['query', key]
  if (recursive) args.push('/s')
  return new Promise((resolve) => {
    execFile('reg.exe', args, { windowsHide: true, maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => {
      resolve(err ? '' : stdout)
    })
  })
}

export function createWindowsRegistry(): Registry {
  return {
    async read(key) {
      const tree = parseRegOutput(await regQuery(key, false))
      return tree.get(normalizeKey(key)) ?? null
    },
    async readTree(key) {
      return parseRegOutput(await regQuery(key, true))
    }
  }
}

/** Registry backed by a JSON object of `{ "HKEY_...\\path": { name: value } }`, used for fixtures. */
export function createStaticRegistry(data: Record<string, RegValues>): Registry {
  const entries = new Map(
    Object.entries(data).map(([k, v]) => [normalizeKey(k).toLowerCase(), { key: normalizeKey(k), v }])
  )
  return {
    async read(key) {
      return entries.get(normalizeKey(key).toLowerCase())?.v ?? null
    },
    async readTree(key) {
      const prefix = normalizeKey(key).toLowerCase()
      const out = new Map<string, RegValues>()
      for (const [lk, { key: k, v }] of entries) {
        if (lk === prefix || lk.startsWith(prefix + '\\')) out.set(k, v)
      }
      return out
    }
  }
}

export const UNINSTALL_KEYS = [
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
]

/** All direct children of the uninstall keys, keyed by subkey name. */
export async function readUninstallEntries(reg: Registry): Promise<Map<string, RegValues>> {
  const out = new Map<string, RegValues>()
  for (const root of UNINSTALL_KEYS) {
    const tree = await reg.readTree(root)
    const depth = root.split('\\').length + 1
    for (const [key, values] of tree) {
      const parts = key.split('\\')
      if (parts.length === depth) out.set(parts[parts.length - 1], values)
    }
  }
  return out
}
