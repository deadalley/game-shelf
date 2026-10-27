import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ScannedGame } from '@shared/types'
import { SCANNERS, scanAll } from '../src/main/scanners'
import { fixtureContext } from '../src/main/scanners/fixtureContext'
import { buildFixtures, generatedSteamGames } from './fixtures/build'

let dir: string
let games: ScannedGame[]
let collections: string[]
let report: Awaited<ReturnType<typeof scanAll>>['report']

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'gameshelf-'))
  await buildFixtures(dir)
  ;({ games, collections, report } = await scanAll(fixtureContext(dir, {})))
})

afterAll(() => rmSync(dir, { recursive: true, force: true }))

const byService = (s: string): ScannedGame[] => games.filter((g) => g.service === s)
const byId = (id: string): ScannedGame | undefined => games.find((g) => g.id === id)

describe('scanAll', () => {
  it('reports every scanner as ok', () => {
    expect(report.map((r) => [r.service, r.ok])).toEqual([
      ['steam', true],
      ['xbox', true],
      ['gog', true],
      ['epic', true],
      ['ea', true],
      ['ubisoft', true],
      ['battlenet', true]
    ])
  })

  it('merges collections from Steam and GOG', () => {
    expect(collections.sort()).toEqual(['Cozy', 'Favorites', 'RPG', 'Strategy'])
  })
})

describe('steam', () => {
  it('finds installed games across library folders and skips runtimes', () => {
    const installed = byService('steam').filter((g) => g.installed)
    expect(installed.map((g) => g.name).sort()).toEqual(
      ['Hollow Lantern', 'Iron Bastion', 'Neon Drift', 'Petal & Thorn', 'Quiet Harbor', 'Starfall Tactics'].sort()
    )
  })

  it('reads playtime, last played and install date', () => {
    const g = byId('steam:1005')!
    expect(g.playtimeMinutes).toBe(12890)
    expect(g.lastPlayed).toBeGreaterThan(0)
    expect(g.installedAt).toBeGreaterThan(0)
    expect(g.launch).toEqual({ type: 'uri', target: 'steam://rungameid/1005' })
    expect(g.collections?.sort()).toEqual(['Favorites', 'Strategy'])
  })

  it('lists played-but-uninstalled games and drops non-games', () => {
    const uninstalled = byService('steam').filter((g) => !g.installed)
    expect(uninstalled.map((g) => g.name).sort()).toEqual(['Glacier Run', 'Moonlit Orchard'])
    expect(byId('steam:3001')).toBeUndefined()
    expect(byId('steam:2002')?.install?.target).toBe('steam://install/2002')
  })

  it('prefers local library cache covers in both layouts', () => {
    expect(byId('steam:1001')?.coverSource).toMatch(/librarycache[\\/]1001[\\/]library_600x900/)
    expect(byId('steam:2001')?.coverSource).toMatch(/2001_library_600x900/)
  })
})

describe('epic', () => {
  it('reads installed manifests and the catalog cache, skipping engines and DLC', () => {
    const epic = byService('epic')
    expect(epic.map((g) => [g.name, g.installed]).sort()).toEqual([
      ['Ember Protocol', false],
      ['Gearbound', true],
      ['Saffron Skies', true],
      ['Tidewalker', false]
    ])
    expect(byId('epic:e1')?.launch?.target).toBe(
      'com.epicgames.launcher://apps/ns1%3Ae1%3ASaffron?action=launch&silent=true'
    )
    expect(byId('epic:e1')?.coverSource).toMatch(/e1\.svg$/)
  })
})

describe('gog', () => {
  it('reads the Galaxy database, ignoring other platforms', () => {
    const gog = byService('gog')
    expect(gog.map((g) => [g.name, g.installed]).sort()).toEqual([
      ['Copper Crown', true],
      ['Lost Signal', false],
      ['Paper Knights', true]
    ])
    const g = byId('gog:1207')!
    expect(g.playtimeMinutes).toBe(2400)
    expect(g.lastPlayed).toBe(Date.parse('2026-10-18T20:10:00Z'))
    expect(g.collections).toEqual(['RPG'])
    expect(g.launch?.type).toBe('exe')
  })
})

describe('other launchers', () => {
  it('ubisoft', () => {
    expect(
      byService('ubisoft')
        .map((g) => g.launch?.target)
        .sort()
    ).toEqual(['uplay://launch/4311/0', 'uplay://launch/5120/0'])
    expect(byId('ubisoft:4311')?.name).toBe('Velvet Assassin')
  })

  it('battle.net maps product codes and skips the launcher itself', () => {
    const bnet = byService('battlenet')
    expect(bnet).toHaveLength(1)
    expect(bnet[0].launch?.target).toBe('battlenet://Fen')
  })

  it('ea uses the exe from DisplayIcon and skips the EA app', () => {
    const ea = byService('ea')
    expect(ea).toHaveLength(1)
    expect(ea[0].id).toBe('ea:71234')
    expect(ea[0].launch).toEqual({ type: 'exe', target: expect.stringMatching(/PK26\.exe$/) })
  })

  it('xbox builds an AppsFolder launch target', () => {
    expect(byService('xbox')[0].launch?.target).toBe('shell:AppsFolder\\Studio.FrontierForge_8wekyb3d8bbwe!Game')
  })
})

describe('scanner selection', () => {
  it('only runs the scanners it is given', async () => {
    const enabled = SCANNERS.filter((s) => s.service !== 'epic' && s.service !== 'steam')
    const res = await scanAll(fixtureContext(dir, {}), enabled)
    expect(res.report.map((r) => r.service)).not.toContain('epic')
    expect(res.games.some((g) => g.service === 'epic' || g.service === 'steam')).toBe(false)
    expect(res.games.some((g) => g.service === 'gog')).toBe(true)
  })
})

describe('generated fixtures', () => {
  it('adds N extra Steam games', async () => {
    const big = mkdtempSync(join(tmpdir(), 'gameshelf-big-'))
    try {
      await buildFixtures(big, { extraGames: 120 })
      const res = await scanAll(
        fixtureContext(big, {}),
        SCANNERS.filter((s) => s.service === 'steam')
      )
      expect(res.games.filter((g) => g.installed)).toHaveLength(6 + 120)
      expect(res.collections).toContain('Backlog')
      expect(generatedSteamGames(3)).toEqual(generatedSteamGames(3)) // deterministic
    } finally {
      rmSync(big, { recursive: true, force: true })
    }
  })
})
