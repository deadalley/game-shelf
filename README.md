# GameShelf

All your PC games from every launcher, on one shelf.

GameShelf is a Windows app that finds the games you have in **Steam, Xbox (Microsoft Store / Game Pass), GOG, Epic Games, EA, Ubisoft Connect and Battle.net** and shows them as a shelf of covers. You can also add any other game yourself.

## Features

- **One library.** Each launcher's local data is read automatically. No logins needed.
- **Filters.** Narrow by service and by installed or not installed, or search by name (`Ctrl+F`).
- **Organize.** Show one big shelf, one shelf per service, or one per collection. Steam collections and GOG Galaxy tags are imported, and you can create your own.
- **Sort.** By name, last played, most played or recently installed.
- **Hide games.** Hover a cover and click the eye icon, or right-click it, to take a game off the shelf (with Undo). Bring hidden games back from **Settings → Hidden games**.
- **Display.** Toggle titles and hours played, resize covers, and show or hide games you've hidden.
- **Layouts.** Four shelves: _Clean_, _Old shelf_, _Modern shelf_ and _Pixel shelf_. Three cover styles: plain, PS-style case or Xbox-style case.
- **Play.** Click a cover's play button or double-click it to launch through the game's launcher. Games that aren't installed open the launcher's install page instead.
- **Edit anything.** Change the name, cover, launch command and collections of any game. Your edits survive rescans, and _Reset to launcher data_ undoes them.
- **Your own games.** Add any `.exe` with a name and cover. GameShelf tracks how long you play them.
- **Settings page.** Turn whole libraries (launchers) on or off. Pick the shelf, cover style, color mode (System / Light / Dark), cover size and animations. Set default sorting and grouping, manage covers and hidden games, and see the scan report.

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

**Settings → Scan** shows what each launcher scan found, or why it failed.

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

### Try it with mock data

You don't need any launchers installed to try GameShelf. One command builds a fake machine with Steam, Xbox, GOG, Epic, EA, Ubisoft and Battle.net "installed" (20 games with covers, playtime, collections and uninstalled games) and starts the app on it. It works in PowerShell, cmd, macOS and Linux:

```bash
npm install
npm run dev:mock                   # hot-reloading dev build on mock data
npm run dev:mock -- --reset        # start over: new mock machine, mock settings wiped
npm run dev:mock -- --games 500    # add 500 generated Steam games to test a big library
npm run preview:mock               # the production build on mock data
```

Everything mock lives in `.fixtures/`. `.fixtures/machine` is the fake launcher data, and `.fixtures/userdata` holds the settings, edits and cover cache. Your real GameShelf data is never touched, and **Settings → About** shows a _Mock data_ badge. On Windows and macOS you also get a **Mock Game** that opens Notepad / TextEdit, so you can try real launching and playtime tracking. Close the editor after a minute and its hours appear. Launching any other mock game just asks Windows to open a fake `steam://` or `uplay://` link, which is harmless.

Things to try:

- Filter by service and installed / not installed. Switch organize (one shelf / by service / by collection) and sort.
- Hover a cover and hide it, then **Undo**. Right-click a cover for Play / Details / Edit / Hide.
- **Settings → Libraries**: switch Epic off and back on. **Settings → Hidden games**: bring hidden games back.
- **Settings → Appearance**: each shelf, PS / Xbox cases, Light / Dark, cover size, animations off.
- Edit a game's name, cover and collections. **Add game** with your own `.exe` and image.

Under the hood this is `GAMESHELF_FIXTURES=<dir>` (read launcher data from a fake machine) plus `GAMESHELF_USER_DATA=<dir>` (separate settings folder). `npm run fixtures` writes the fake machine on its own.

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
scripts/             dev-mock.mjs (run on mock data) and make-fixtures.ts
```

### Releasing

Pushing a tag like `v0.2.0` makes the GitHub Actions workflow build the installer on `windows-latest` and attach it to a GitHub Release. Every push to `main` also uploads the installer as a workflow artifact.
