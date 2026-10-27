# GameShelf

All your PC games from every launcher, on one shelf.

GameShelf is a Windows app that finds the games you have in **Steam, Xbox (Microsoft Store / Game Pass), GOG, Epic Games, EA, Ubisoft Connect and Battle.net** and shows them as a shelf of covers. You can also add any other game yourself.

## Features

- **One library.** Each launcher's local data is read automatically. No logins needed.
- **Filters.** Narrow by service and by installed or not installed, or search by name (`Ctrl+F`).
- **Organize.** Show one big shelf, one shelf per service, or one per collection. Steam collections and GOG Galaxy tags are imported, and you can create your own.
- **Sort.** By name, last played, most played or recently installed.
- **Display.** Toggle titles and hours played, resize covers, and show or hide games you've hidden.
- **Layouts.** Four shelves: _Clean_, _Old shelf_, _Modern shelf_ and _Pixel shelf_. Three cover styles: plain, PS-style case or Xbox-style case.
- **Play.** Click a cover's play button or double-click it to launch through the game's launcher. Games that aren't installed open the launcher's install page instead.
- **Edit anything.** Change the name, cover, launch command and collections of any game. Your edits survive rescans, and _Reset to launcher data_ undoes them.
- **Your own games.** Add any `.exe` with a name and cover. GameShelf tracks how long you play them.

## What each launcher provides

| Launcher   | Installed | Not installed                                 | Hours / last played | Cover source                        |
| ---------- | --------- | --------------------------------------------- | ------------------- | ----------------------------------- |
| Steam      | ✓         | ✓ (games you've played or put in collections) | ✓                   | Steam library cache, then Steam CDN |
| GOG        | ✓         | ✓ (requires GOG Galaxy 2.0)                   | ✓ (Galaxy)          | Galaxy                              |
| Epic Games | ✓         | ✓ (launcher catalog cache)                    | –                   | Epic catalog                        |
| Xbox       | ✓         | –                                             | –                   | SteamGridDB                         |
| EA         | ✓         | –                                             | –                   | SteamGridDB                         |
| Ubisoft    | ✓         | –                                             | –                   | SteamGridDB                         |
| Battle.net | ✓         | –                                             | –                   | SteamGridDB                         |

Where a launcher doesn't provide a cover, GameShelf uses [SteamGridDB](https://www.steamgriddb.com). Paste a free API key in **Settings** (get one from your SteamGridDB profile → _Preferences_ → _API_). Without a key, those games show a neutral placeholder until you set a cover yourself.

**Settings → Scan report** shows what each launcher scan found, or why it failed.

## Install

Download `GameShelf-Setup-x.y.z.exe` from the [Releases](../../releases) page and run it. The installer isn't code-signed, so Windows SmartScreen may warn you the first time. Choose **More info → Run anyway**.

## Development

Requires Node.js 22.

```bash
npm install
npm run dev        # run with hot reload
npm test           # scanner and parser tests
npm run typecheck
npm run dist       # build the Windows installer into dist/ (run on Windows)
```

Launcher scanning only runs on Windows. To work on another OS, generate a fake machine with every launcher installed and point the app at it:

```bash
npm run fixtures                       # writes .fixtures/
GAMESHELF_FIXTURES=$PWD/.fixtures npm run dev
```

`GAMESHELF_USER_DATA=<dir>` uses a separate settings and cover-cache folder.

### Layout

```
src/main/            Electron main process
  scanners/          one file per launcher, plus the scan orchestrator
  covers/            cover resolution and on-disk cache (served via gamecover://)
  db/store.ts        JSON store: settings, user edits, custom games, scan cache
  library.ts         merges scanned games with user edits
src/preload/         typed IPC bridge (window.gameshelf)
src/renderer/        React UI (Zustand state, Framer Motion animations)
src/shared/types.ts  types shared by both sides
test/                vitest suites and the fixture generator
```

### Releasing

Pushing a tag like `v0.2.0` makes the GitHub Actions workflow build the installer on `windows-latest` and attach it to a GitHub Release. Every push to `main` also uploads the installer as a workflow artifact.
