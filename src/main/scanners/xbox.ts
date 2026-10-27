import type { ScannedGame } from '@shared/types'
import { statTime } from '../util/fs'
import type { ScanResult, Scanner } from './types'

/**
 * Lists Store/Game Pass packages that ship a MicrosoftGame.config (the marker of a GDK game)
 * and emits name, family name, app id and install location as JSON.
 */
export const XBOX_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$out = @()
foreach ($p in Get-AppxPackage) {
  if ($p.IsFramework -or $p.IsResourcePackage -or -not $p.InstallLocation) { continue }
  $cfg = Join-Path $p.InstallLocation 'MicrosoftGame.config'
  if (-not (Test-Path $cfg)) { continue }
  [xml]$x = Get-Content $cfg -Raw
  $name = $x.Game.ShellVisuals.DefaultDisplayName
  if (-not $name) { $name = $x.Game.Identity.Name }
  $appId = (Get-AppxPackageManifest $p).Package.Applications.Application | Select-Object -First 1 -ExpandProperty Id
  $out += [pscustomobject]@{ name = $name; family = $p.PackageFamilyName; appId = $appId; location = $p.InstallLocation }
}
ConvertTo-Json -InputObject @($out) -Compress
`

interface XboxPackage {
  name: string
  family: string
  appId: string
  location: string
}

export function parseXboxOutput(stdout: string): XboxPackage[] {
  try {
    const data = JSON.parse(stdout.trim() || '[]')
    return (Array.isArray(data) ? data : [data]).filter((p) => p && p.name && p.family && p.appId)
  } catch {
    return []
  }
}

export const xboxScanner: Scanner = {
  service: 'xbox',
  async scan(ctx): Promise<ScanResult> {
    const packages = parseXboxOutput(await ctx.powershell(XBOX_SCRIPT))
    const games: ScannedGame[] = []
    for (const p of packages) {
      games.push({
        id: `xbox:${p.family}`,
        service: 'xbox',
        name: p.name,
        installed: true,
        installPath: p.location,
        installedAt: await statTime(p.location),
        launch: { type: 'uri', target: `shell:AppsFolder\\${p.family}!${p.appId}` }
      })
    }
    return { games, message: games.length ? undefined : 'No Xbox games found' }
  }
}
