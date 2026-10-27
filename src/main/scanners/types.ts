import type { ScannedGame, Service } from '@shared/types'
import type { Registry } from '../util/registry'

export interface ScanPaths {
  programData: string // C:\ProgramData
  programFiles: string // C:\Program Files
  programFilesX86: string // C:\Program Files (x86)
  localAppData: string // %LOCALAPPDATA%
  appData: string // %APPDATA%
  systemDrive: string // C:\
}

/** Everything a scanner touches outside pure parsing, so tests can swap in fixtures. */
export interface ScanContext {
  paths: ScanPaths
  reg: Registry
  /** Runs a PowerShell script and returns stdout ('' on failure). */
  powershell(script: string): Promise<string>
  /** GETs JSON, or null on any failure. */
  fetchJson(url: string): Promise<unknown>
  /** Persistent cache of Steam app id → name (null = not a game / unknown). */
  steamNames: Record<string, string | null>
}

export interface ScanResult {
  games: ScannedGame[]
  /** Collections discovered in launcher data, e.g. Steam collections. */
  collections?: string[]
  message?: string
}

export interface Scanner {
  service: Service
  scan(ctx: ScanContext): Promise<ScanResult>
}
