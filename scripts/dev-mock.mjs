// Runs GameShelf against a fake machine with every launcher "installed", on any OS.
//
//   npm run dev:mock                     dev mode with hot reload
//   npm run dev:mock -- --reset          wipe the mock machine and mock settings first
//   npm run dev:mock -- --games 500      add 500 generated Steam games (implies a rebuild)
//   npm run preview:mock                 same, against the production build
//
// Everything lives in .fixtures/: your real GameShelf settings and covers are never touched.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const fixtures = join(root, '.fixtures')
const machine = join(fixtures, 'machine')
const userData = join(fixtures, 'userdata')

const args = process.argv.slice(2)
const reset = args.includes('--reset')
const preview = args.includes('--preview')
const gamesIdx = args.indexOf('--games')
const games = gamesIdx >= 0 ? Number(args[gamesIdx + 1]) || 0 : 0

function run(command, env = {}) {
  return new Promise((done, fail) => {
    const child = spawn(command, { cwd: root, stdio: 'inherit', shell: true, env: { ...process.env, ...env } })
    child.on('exit', (code) => (code === 0 ? done() : fail(new Error(`${command} exited with ${code}`))))
  })
}

/** A custom game that points at a real, harmless program so launching and playtime tracking can be tried. */
function seedCustomGame() {
  const program =
    process.platform === 'win32'
      ? 'C:\\Windows\\System32\\notepad.exe'
      : process.platform === 'darwin'
        ? '/System/Applications/TextEdit.app/Contents/MacOS/TextEdit'
        : undefined
  if (!program || !existsSync(program)) return
  const cover = join(machine, 'remote', 'custom-notepad.svg')
  const lines = [0, 1, 2, 3, 4]
    .map((i) => `<rect x="190" y="${280 + i * 56}" width="${i === 4 ? 140 : 220}" height="18" rx="9"/>`)
    .join('')
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900">',
    '<rect width="600" height="900" fill="#3d3a36"/>',
    '<rect x="150" y="220" width="300" height="380" rx="24" fill="#e9e5de"/>',
    `<g fill="#8a857c">${lines}</g>`,
    '<text x="300" y="760" text-anchor="middle" font-family="Arial Black, Arial" font-size="56" fill="#fff">MOCK GAME</text>',
    '</svg>'
  ].join('')
  writeFileSync(cover, svg)
  const id = 'custom:mock-notepad'
  const store = {
    version: 1,
    customGames: [{ id, name: 'Mock Game (opens a text editor)', exePath: program, cover, addedAt: Date.now() }],
    overrides: { [id]: { cover } }
  }
  mkdirSync(userData, { recursive: true })
  writeFileSync(join(userData, 'library.json'), JSON.stringify(store, null, 2))
}

if (reset || games) rmSync(fixtures, { recursive: true, force: true })

if (!existsSync(join(machine, 'registry.json'))) {
  await run(`npx vite-node scripts/make-fixtures.ts "${machine}"${games ? ` --games ${games}` : ''}`)
}
if (!existsSync(join(userData, 'library.json'))) seedCustomGame()

console.log(`\nStarting GameShelf with mock data\n  machine:  ${machine}\n  settings: ${userData}\n`)
await run(preview ? 'npx electron-vite preview' : 'npx electron-vite dev', {
  GAMESHELF_FIXTURES: machine,
  GAMESHELF_USER_DATA: userData
})
