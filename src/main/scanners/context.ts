import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { net } from 'electron'
import { createWindowsRegistry } from '../util/registry'
import { fixtureContext } from './fixtureContext'
import type { ScanContext } from './types'

function windowsPaths(): ScanContext['paths'] {
  const env = process.env
  const drive = (env.SystemDrive ?? 'C:') + '\\'
  return {
    programData: env.ProgramData ?? join(drive, 'ProgramData'),
    programFiles: env.ProgramFiles ?? join(drive, 'Program Files'),
    programFilesX86: env['ProgramFiles(x86)'] ?? join(drive, 'Program Files (x86)'),
    localAppData: env.LOCALAPPDATA ?? '',
    appData: env.APPDATA ?? '',
    systemDrive: drive
  }
}

function runPowershell(script: string): Promise<string> {
  const prefix = '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;'
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', prefix + script],
      { windowsHide: true, maxBuffer: 32 * 1024 * 1024, timeout: 60_000 },
      (err, stdout) => resolve(err ? '' : stdout)
    )
  })
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const res = await net.fetch(url, { headers: { 'User-Agent': 'GameShelf' } })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

export function createScanContext(steamNames: Record<string, string | null>): ScanContext | null {
  const fixtures = process.env.GAMESHELF_FIXTURES
  if (fixtures) return fixtureContext(fixtures, steamNames)
  if (process.platform !== 'win32') return null
  return {
    paths: windowsPaths(),
    reg: createWindowsRegistry(),
    powershell: runPowershell,
    fetchJson,
    steamNames
  }
}
