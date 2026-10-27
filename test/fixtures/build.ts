/**
 * Builds a fake Windows machine with every supported launcher installed, so scanners
 * and the UI can be exercised on any OS. See scripts/make-fixtures.ts.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import initSqlJs from 'sql.js'

const PALETTES = [
  ['#2b2d42', '#ef233c'],
  ['#1b4332', '#95d5b2'],
  ['#3a0ca3', '#f72585'],
  ['#264653', '#e9c46a'],
  ['#14213d', '#fca311'],
  ['#5f0f40', '#fb8b24'],
  ['#0b132b', '#5bc0be'],
  ['#3d405b', '#f2cc8f'],
  ['#283618', '#dda15e'],
  ['#2d00f7', '#f20089'],
  ['#03045e', '#90e0ef'],
  ['#432818', '#ffe6a7']
]

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function coverSvg(title: string, seed: number): string {
  const [a, b] = PALETTES[seed % PALETTES.length]
  const words = title.toUpperCase().split(' ')
  const lines: string[] = []
  for (const w of words) {
    const last = lines[lines.length - 1]
    if (last && (last + ' ' + w).length <= 12) lines[lines.length - 1] = last + ' ' + w
    else lines.push(w)
  }
  const shape =
    seed % 3 === 0
      ? `<circle cx="300" cy="360" r="190" fill="${b}" opacity="0.85"/>`
      : seed % 3 === 1
        ? `<polygon points="300,120 520,560 80,560" fill="${b}" opacity="0.8"/>`
        : `<rect x="110" y="170" width="380" height="380" rx="40" transform="rotate(12 300 360)" fill="${b}" opacity="0.8"/>`
  const text = lines
    .map((l, i) => `<text x="300" y="${700 + i * 64}" text-anchor="middle">${escapeXml(l)}</text>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="#0d0d0f"/></linearGradient></defs>
<rect width="600" height="900" fill="url(#g)"/>${shape}
<rect y="600" width="600" height="300" fill="#000" opacity="0.25"/>
<g font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="58" fill="#fff" letter-spacing="2">${text}</g>
</svg>`
}

function write(path: string, content: string | Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

const NOW = Date.UTC(2026, 9, 20) / 1000
const day = 86400

export const STEAM_INSTALLED = [
  { appid: '1001', name: 'Hollow Lantern', playtime: 4210, last: NOW - day * 1, lib: 'main' },
  { appid: '1002', name: 'Starfall Tactics', playtime: 860, last: NOW - day * 12, lib: 'main' },
  { appid: '1003', name: 'Neon Drift', playtime: 75, last: NOW - day * 40, lib: 'second' },
  { appid: '1004', name: 'Quiet Harbor', playtime: 0, last: 0, lib: 'second' },
  { appid: '1005', name: 'Iron Bastion', playtime: 12890, last: NOW - day * 3, lib: 'main' },
  { appid: '1006', name: 'Petal & Thorn', playtime: 320, last: NOW - day * 90, lib: 'main' }
]
export const STEAM_UNINSTALLED = [
  { appid: '2001', name: 'Glacier Run', playtime: 1450, last: NOW - day * 200 },
  { appid: '2002', name: 'Moonlit Orchard', playtime: 95, last: NOW - day * 400 }
]

const WORDS_A = [
  'Crimson',
  'Silent',
  'Hollow',
  'Iron',
  'Velvet',
  'Frozen',
  'Golden',
  'Echo',
  'Wild',
  'Paper',
  'Neon',
  'Ashen'
]
const WORDS_B = [
  'Harbor',
  'Crown',
  'Signal',
  'Garden',
  'Frontier',
  'Tide',
  'Reverie',
  'Circuit',
  'Lantern',
  'Atlas',
  'Grove',
  'Spire'
]

/** Deterministic pseudo-random numbers so generated libraries are the same on every run. */
function rng(seed: number): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

/** Extra Steam games for testing large libraries. */
export function generatedSteamGames(
  count: number
): { appid: string; name: string; playtime: number; last: number; lib: string; collection?: string }[] {
  const rand = rng(42)
  return Array.from({ length: count }, (_, i) => {
    const played = rand() < 0.7
    const pick = rand()
    return {
      appid: String(5000 + i),
      name: `${WORDS_A[Math.floor(rand() * WORDS_A.length)]} ${WORDS_B[Math.floor(rand() * WORDS_B.length)]} ${i + 1}`,
      playtime: played ? Math.floor(rand() ** 3 * 20000) : 0,
      last: played ? Math.floor(NOW - rand() * day * 900) : 0,
      lib: rand() < 0.5 ? 'main' : 'second',
      collection: pick < 0.15 ? 'Backlog' : pick < 0.25 ? 'Cozy' : pick < 0.32 ? 'Strategy' : undefined
    }
  })
}

export interface FixtureOptions {
  /** Number of extra generated Steam games (default 0). */
  extraGames?: number
}

export async function buildFixtures(root: string, opts: FixtureOptions = {}): Promise<string> {
  root = resolve(root)
  const extra = generatedSteamGames(opts.extraGames ?? 0)
  const installed = [...STEAM_INSTALLED, ...extra]
  const steam = join(root, 'Program Files (x86)', 'Steam')
  const secondLib = join(root, 'SteamLibrary')
  const registry: Record<string, Record<string, string>> = {}
  let seed = 0

  // ---------- Steam ----------
  registry['HKEY_CURRENT_USER\\Software\\Valve\\Steam'] = { SteamPath: steam }
  write(
    join(steam, 'steamapps', 'libraryfolders.vdf'),
    `"libraryfolders"
{
  "0" { "path" "${steam.replace(/\\/g, '\\\\')}" "apps" { "1001" "1" } }
  "1" { "path" "${secondLib.replace(/\\/g, '\\\\')}" }
}`
  )
  for (const g of installed) {
    const lib = g.lib === 'main' ? steam : secondLib
    write(
      join(lib, 'steamapps', `appmanifest_${g.appid}.acf`),
      `"AppState"\n{\n\t"appid"\t\t"${g.appid}"\n\t"name"\t\t"${g.name}"\n\t"StateFlags"\t\t"4"\n\t"installdir"\t\t"${g.name}"\n\t"LastUpdated"\t\t"${NOW - day * ((Number(g.appid) * 37) % 1200)}"\n}\n`
    )
    write(join(steam, 'appcache', 'librarycache', g.appid, 'library_600x900.svg'), coverSvg(g.name, seed++))
  }
  // A runtime that must be filtered out
  write(
    join(steam, 'steamapps', 'appmanifest_228980.acf'),
    `"AppState" { "appid" "228980" "name" "Steamworks Common Redistributables" "StateFlags" "4" "installdir" "Steamworks Shared" }`
  )
  for (const g of STEAM_UNINSTALLED) {
    write(join(steam, 'appcache', 'librarycache', `${g.appid}_library_600x900.svg`), coverSvg(g.name, seed++))
  }
  write(
    join(steam, 'config', 'loginusers.vdf'),
    `"users" { "76561197960277073" { "AccountName" "player" "MostRecent" "1" } }`
  )
  const apps = [...installed, ...STEAM_UNINSTALLED, { appid: '3001', name: 'Some DLC', playtime: 30, last: NOW }]
    .filter((g) => g.playtime || g.last)
    .map((g) => `"${g.appid}" { "LastPlayed" "${g.last}" "Playtime" "${g.playtime}" }`)
    .join('\n')
  write(
    join(steam, 'userdata', '11345', 'config', 'localconfig.vdf'),
    `"UserLocalConfigStore" { "Software" { "Valve" { "Steam" { "apps" { ${apps} } } } } }`
  )
  const extraIn = (c: string): number[] => extra.filter((g) => g.collection === c).map((g) => Number(g.appid))
  const coll = (id: string, name: string, added: number[]): [string, object] => [
    `user-collections.${id}`,
    { key: `user-collections.${id}`, timestamp: NOW, value: JSON.stringify({ id, name, added, removed: [] }) }
  ]
  write(
    join(steam, 'userdata', '11345', 'config', 'cloudstorage', 'cloud-storage-namespace-1.json'),
    JSON.stringify([
      coll('favorite', '', [1001, 1005]),
      coll('uc-1', 'Cozy', [1004, 1006, 2002, ...extraIn('Cozy')]),
      coll('uc-2', 'Strategy', [1002, 1005, ...extraIn('Strategy')]),
      ...(extraIn('Backlog').length ? [coll('uc-3', 'Backlog', extraIn('Backlog'))] : []),
      coll('hidden', '', [1003])
    ])
  )
  write(
    join(root, 'steam-appdetails.json'),
    JSON.stringify({
      ...Object.fromEntries(
        STEAM_UNINSTALLED.map((g) => [g.appid, { success: true, data: { name: g.name, type: 'game' } }])
      ),
      '3001': { success: true, data: { name: 'Some DLC', type: 'dlc' } }
    })
  )

  // ---------- Epic ----------
  const epicData = join(root, 'ProgramData', 'Epic', 'EpicGamesLauncher', 'Data')
  const epicGames = [
    { id: 'e1', ns: 'ns1', app: 'Saffron', name: 'Saffron Skies', installed: true },
    { id: 'e2', ns: 'ns2', app: 'Gearbound', name: 'Gearbound', installed: true },
    { id: 'e3', ns: 'ns3', app: 'Tidewalker', name: 'Tidewalker', installed: false },
    { id: 'e4', ns: 'ns4', app: 'Ember', name: 'Ember Protocol', installed: false }
  ]
  const catalog = []
  for (const g of epicGames) {
    const cover = join(root, 'remote', 'epic', `${g.id}.svg`)
    write(cover, coverSvg(g.name, seed++))
    catalog.push({
      id: g.id,
      namespace: g.ns,
      title: g.name,
      categories: [{ path: 'games' }, { path: 'applications' }],
      keyImages: [{ type: 'DieselGameBoxTall', url: cover }],
      releaseInfo: [{ appId: g.app }]
    })
    if (g.installed) {
      write(
        join(epicData, 'Manifests', `${g.id}.item`),
        JSON.stringify({
          DisplayName: g.name,
          InstallLocation: join(root, 'Epic Games', g.app),
          CatalogNamespace: g.ns,
          CatalogItemId: g.id,
          AppName: g.app,
          AppCategories: ['public', 'games', 'applications']
        })
      )
    }
  }
  catalog.push({
    id: 'dlc1',
    namespace: 'ns1',
    title: 'Saffron Skies Soundtrack',
    categories: [{ path: 'addons' }],
    mainGameItem: { id: 'e1' }
  })
  write(join(epicData, 'Catalog', 'catcache.bin'), Buffer.from(JSON.stringify(catalog)).toString('base64'))
  write(
    join(epicData, 'Manifests', 'ue.item'),
    JSON.stringify({
      DisplayName: 'Unreal Engine',
      CatalogNamespace: 'ue',
      CatalogItemId: 'ue',
      AppName: 'UE_5',
      AppCategories: ['engines']
    })
  )

  // ---------- GOG Galaxy ----------
  const require = createRequire(import.meta.url)
  const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') })
  const db = new SQL.Database()
  db.run(`
    CREATE TABLE GamePieceTypes (id INTEGER PRIMARY KEY, type TEXT);
    CREATE TABLE GamePieces (releaseKey TEXT, gamePieceTypeId INTEGER, userId INTEGER, value TEXT);
    CREATE TABLE LibraryReleases (releaseKey TEXT, userId INTEGER);
    CREATE TABLE InstalledBaseProducts (productId INTEGER, installationDate TEXT);
    CREATE TABLE GameTimes (userId INTEGER, releaseKey TEXT, minutesInGame INTEGER);
    CREATE TABLE LastPlayedDates (userId INTEGER, gameReleaseKey TEXT, lastPlayedDate TEXT);
    CREATE TABLE UserReleaseTags (userId INTEGER, releaseKey TEXT, tag TEXT);
    INSERT INTO GamePieceTypes VALUES (1, 'title'), (2, 'originalImages'), (3, 'originalTitle');
  `)
  const gogGames = [
    { id: '1207', name: 'Copper Crown', installed: true, minutes: 2400, last: '2026-10-18 20:10:00', tags: ['RPG'] },
    { id: '1208', name: 'Lost Signal', installed: false, minutes: 300, last: '2025-02-01 10:00:00', tags: ['Cozy'] },
    { id: '1209', name: 'Paper Knights', installed: true, minutes: 0, last: null, tags: [] }
  ]
  for (const g of gogGames) {
    const key = `gog_${g.id}`
    const cover = join(root, 'remote', 'gog', `${g.id}.svg`)
    write(cover, coverSvg(g.name, seed++))
    db.run('INSERT INTO LibraryReleases VALUES (?, 1)', [key])
    db.run('INSERT INTO GamePieces VALUES (?, 1, 1, ?)', [key, JSON.stringify({ title: g.name })])
    db.run('INSERT INTO GamePieces VALUES (?, 2, 1, ?)', [key, JSON.stringify({ verticalCover: cover })])
    if (g.minutes) db.run('INSERT INTO GameTimes VALUES (1, ?, ?)', [key, g.minutes])
    if (g.last) db.run('INSERT INTO LastPlayedDates VALUES (1, ?, ?)', [key, g.last])
    for (const t of g.tags) db.run('INSERT INTO UserReleaseTags VALUES (1, ?, ?)', [key, t])
    if (g.installed) {
      db.run('INSERT INTO InstalledBaseProducts VALUES (?, ?)', [Number(g.id), '2026-03-04 12:00:00'])
      const path = join(root, 'GOG Games', g.name)
      mkdirSync(path, { recursive: true })
      registry[`HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\GOG.com\\Games\\${g.id}`] = {
        gameName: g.name,
        path,
        exe: join(path, 'game.exe')
      }
    }
  }
  // Releases from other platforms that Galaxy integrates must be ignored.
  db.run(`INSERT INTO LibraryReleases VALUES ('steam_1001', 1)`)
  write(join(root, 'ProgramData', 'GOG.com', 'Galaxy', 'storage', 'galaxy-2.0.db'), db.export())
  db.close()

  // ---------- Ubisoft ----------
  for (const [id, name] of [
    ['4311', 'Velvet Assassin'],
    ['5120', 'Skyward Rally']
  ]) {
    const dir = join(root, 'Ubisoft Game Launcher', 'games', name)
    mkdirSync(dir, { recursive: true })
    registry[`HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs\\${id}`] = {
      InstallDir: dir + '/'
    }
    registry[
      `HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Uplay Install ${id}`
    ] = {
      DisplayName: name,
      Publisher: 'Ubisoft'
    }
  }

  // ---------- Battle.net ----------
  const bnetDir = join(root, 'Battle.net Games', 'Rift Legends')
  mkdirSync(bnetDir, { recursive: true })
  registry['HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Rift Legends'] = {
    DisplayName: 'Rift Legends',
    Publisher: 'Blizzard Entertainment',
    InstallLocation: bnetDir,
    UninstallString: `"C:\\ProgramData\\Battle.net\\Agent\\Blizzard Uninstaller.exe" --lang=enUS --uid=fenris --displayname="Rift Legends"`
  }
  registry['HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Battle.net'] = {
    DisplayName: 'Battle.net',
    Publisher: 'Blizzard Entertainment',
    UninstallString: `"C:\\Program Files (x86)\\Battle.net\\Battle.net.exe" --uid=battle.net`
  }

  // ---------- EA ----------
  const eaDir = join(root, 'EA Games', 'Pitch Kings 26')
  write(
    join(eaDir, '__Installer', 'installerdata.xml'),
    '<DiPManifest><contentIDs><contentID>71234</contentID></contentIDs></DiPManifest>'
  )
  registry['HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{EA-PK26}'] = {
    DisplayName: 'Pitch Kings 26',
    Publisher: 'Electronic Arts',
    InstallLocation: eaDir,
    DisplayIcon: `"${join(eaDir, 'PK26.exe')}",0`
  }
  registry['HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\EA app'] = {
    DisplayName: 'EA app',
    Publisher: 'Electronic Arts',
    InstallLocation: join(root, 'EA app')
  }

  // ---------- Xbox ----------
  const xboxDir = join(root, 'XboxGames', 'Frontier Forge', 'Content')
  mkdirSync(xboxDir, { recursive: true })
  write(
    join(root, 'xbox.json'),
    JSON.stringify([
      { name: 'Frontier Forge', family: 'Studio.FrontierForge_8wekyb3d8bbwe', appId: 'Game', location: xboxDir }
    ])
  )

  write(join(root, 'registry.json'), JSON.stringify(registry, null, 2))
  return root
}
