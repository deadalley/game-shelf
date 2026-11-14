import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/types'
import { sanitizeSettings, type StoreData } from '../src/main/db/store'
import { buildGames } from '../src/main/library'
import { splitArgs } from '../src/main/util/args'
import { parseRegOutput } from '../src/main/util/registry'
import { parseVdf, vstr } from '../src/main/util/vdf'
import { parseLibraryFolders } from '../src/main/scanners/steam'
import { exeFromDisplayIcon } from '../src/main/scanners/ea'
import { parseXboxOutput } from '../src/main/scanners/xbox'

describe('vdf', () => {
  it('parses nested objects, escapes, comments and case-insensitive lookups', () => {
    const v = parseVdf(`// comment\n"Root"\n{\n  "Path"  "C:\\\\Games\\\\Steam"\n  "Inner" { "Key" "value" }\n}`)
    expect(vstr(v, 'root', 'path')).toBe('C:\\Games\\Steam')
    expect(vstr(v, 'ROOT', 'inner', 'key')).toBe('value')
  })

  it('reads both libraryfolders formats', () => {
    expect(parseLibraryFolders(`"libraryfolders" { "0" { "path" "C:\\\\Steam" } "1" { "path" "D:\\\\Lib" } }`)).toEqual(
      ['C:\\Steam', 'D:\\Lib']
    )
    expect(parseLibraryFolders(`"LibraryFolders" { "TimeNextStatsReport" "123" "1" "E:\\\\Old" }`)).toEqual(['E:\\Old'])
  })
})

describe('registry output', () => {
  it('parses reg query /s output', () => {
    const out = [
      '',
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\Test\\A',
      '    DisplayName    REG_SZ    Some Game',
      '    Size    REG_DWORD    0x10',
      '    Empty    REG_SZ    ',
      '',
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\Test\\B',
      '    (Default)    REG_SZ    x'
    ].join('\r\n')
    const tree = parseRegOutput(out)
    expect(tree.get('HKEY_LOCAL_MACHINE\\SOFTWARE\\Test\\A')).toEqual({
      DisplayName: 'Some Game',
      Size: '16',
      Empty: ''
    })
    expect(tree.get('HKEY_LOCAL_MACHINE\\SOFTWARE\\Test\\B')).toEqual({ '': 'x' })
  })
})

describe('helpers', () => {
  it('splits args with quotes', () => {
    expect(splitArgs('/command=runGame /gameId=1 /path="C:\\Program Files\\X"')).toEqual([
      '/command=runGame',
      '/gameId=1',
      '/path=C:\\Program Files\\X'
    ])
    expect(splitArgs('-a "b c" ""')).toEqual(['-a', 'b c', ''])
  })

  it('extracts exe from DisplayIcon', () => {
    expect(exeFromDisplayIcon('"C:\\Games\\X\\x.exe",0')).toBe('C:\\Games\\X\\x.exe')
    expect(exeFromDisplayIcon('C:\\Games\\X\\icon.ico')).toBeUndefined()
  })

  it('parses single-object PowerShell JSON', () => {
    expect(parseXboxOutput('{"name":"A","family":"F","appId":"App","location":"C:\\\\X"}')).toHaveLength(1)
    expect(parseXboxOutput('')).toEqual([])
  })
})

describe('buildGames', () => {
  const base: StoreData = {
    version: 1,
    settings: DEFAULT_SETTINGS,
    overrides: {},
    customGames: [],
    userCollections: [],
    scanned: {
      games: [
        { id: 'steam:1', service: 'steam', name: 'Orig', installed: true, playtimeMinutes: 10, collections: ['A'] }
      ],
      collections: [],
      report: [],
      scannedAt: 0
    },
    steamNames: {},
    covers: {}
  }

  it('applies overrides and adds tracked time', () => {
    const data: StoreData = {
      ...base,
      overrides: { 'steam:1': { name: 'Renamed', collections: ['B'], trackedMinutes: 5, cover: '/tmp/c.png' } }
    }
    const [g] = buildGames(data)
    expect(g.name).toBe('Renamed')
    expect(g.collections).toEqual(['B'])
    expect(g.playtimeMinutes).toBe(15)
    expect(g.coverUrl).toBe('gamecover://g/steam%3A1?v=c.png')
  })

  it('includes custom games', () => {
    const data: StoreData = {
      ...base,
      customGames: [{ id: 'custom:x', name: 'Mine', exePath: 'C:\\m.exe', cover: '/c.png', addedAt: 1 }]
    }
    const custom = buildGames(data).find((g) => g.id === 'custom:x')!
    expect(custom.service).toBe('custom')
    expect(custom.launch).toEqual({ type: 'exe', target: 'C:\\m.exe', args: undefined })
    expect(custom.playtimeMinutes).toBeUndefined()
  })
})

describe('disabled libraries', () => {
  it('buildGames drops games from switched-off launchers but keeps custom games', () => {
    const data: StoreData = {
      version: 1,
      settings: { ...DEFAULT_SETTINGS, disabledServices: ['steam'] },
      overrides: {},
      customGames: [{ id: 'custom:x', name: 'Mine', exePath: 'C:\\m.exe', cover: '/c.png', addedAt: 1 }],
      userCollections: [],
      scanned: {
        games: [
          { id: 'steam:1', service: 'steam', name: 'A', installed: true },
          { id: 'gog:1', service: 'gog', name: 'B', installed: true }
        ],
        collections: [],
        report: [],
        scannedAt: 0
      },
      steamNames: {},
      covers: {}
    }
    expect(buildGames(data).map((g) => g.id)).toEqual(['gog:1', 'custom:x'])
  })
})

describe('settings from older or hand-edited files', () => {
  it('clamps background transparency and fixes removed options', () => {
    const fix = (patch: Partial<typeof DEFAULT_SETTINGS>) => sanitizeSettings({ ...DEFAULT_SETTINGS, ...patch })
    expect(fix({ backgroundTransparency: 150 }).backgroundTransparency).toBe(100)
    expect(fix({ backgroundTransparency: -5 }).backgroundTransparency).toBe(0)
    expect(fix({ backgroundTransparency: 37.4 }).backgroundTransparency).toBe(37)
    expect(fix({ backgroundTransparency: undefined as unknown as number }).backgroundTransparency).toBe(0)
    expect(fix({ sort: 'installedAt' as never }).sort).toBe('name')
  })
})
