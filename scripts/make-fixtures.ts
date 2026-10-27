import { buildFixtures } from '../test/fixtures/build'

// Usage: vite-node scripts/make-fixtures.ts [dir] [--games N]
const args = process.argv.slice(2)
const gamesIdx = args.indexOf('--games')
const extraGames = gamesIdx >= 0 ? Number(args[gamesIdx + 1]) || 0 : 0
const dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--games') ?? '.fixtures/machine'

void buildFixtures(dir, { extraGames }).then((root) =>
  console.log(`Mock machine written to ${root}${extraGames ? ` (+${extraGames} generated games)` : ''}`)
)
