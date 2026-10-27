import { buildFixtures } from '../test/fixtures/build'

const dir = process.argv[2] ?? '.fixtures'
void buildFixtures(dir).then((root) => console.log(`Fixtures written to ${root}`))
