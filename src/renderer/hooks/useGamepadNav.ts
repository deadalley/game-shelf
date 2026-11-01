import { useEffect } from 'react'
import { SERVICES, type Service } from '@shared/types'
import { BTN, Repeater, STICK_DEADZONE } from '../lib/gamepad'
import { pickNext, type Direction } from '../lib/spatial'
import { useLibrary, type ControllerContext } from '../state/useLibrary'

const FOCUSABLE =
  'button:not([disabled]), [role="button"], [role="switch"], [role="radio"], input:not([disabled]), select:not([disabled]), a[href]'
const GAME = '.card, .spine-item'

/** The layer that currently owns input: the topmost dialog, menu, settings page, or the main view. */
function currentLayer(): { root: ParentNode; context: ControllerContext } {
  const dialogs = document.querySelectorAll('.dialog')
  if (dialogs.length) return { root: dialogs[dialogs.length - 1], context: 'dialog' }
  const menu = document.querySelector('.context-menu') ?? document.querySelector('.toolbar .popover')
  if (menu) return { root: menu, context: 'menu' }
  const settings = document.querySelector('.settings-page')
  if (settings) return { root: settings, context: 'settings' }
  const inDrawer = document.activeElement?.closest('.drawer')
  return { root: document.body, context: inDrawer ? 'drawer' : 'shelf' }
}

function focusables(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
    // A game card or spine is one stop; the buttons inside it are reached with A / X / Y instead.
    if (el.parentElement?.closest(GAME)) return false
    if (el.closest('[aria-hidden="true"]')) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
  })
}

function focus(el: HTMLElement): void {
  el.focus({ preventScroll: true, focusVisible: true } as FocusOptions)
  const smooth = useLibrary.getState().settings.animations
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: smooth ? 'smooth' : 'auto' })
}

function firstGame(root: ParentNode): HTMLElement | null {
  return root.querySelector<HTMLElement>(GAME) ?? focusables(root)[0] ?? null
}

function key(el: Element, k: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
}

/** Lets the whole app be driven with an Xbox (or any standard-mapping) controller. */
export function useGamepadNav(): void {
  const enabled = useLibrary((s) => s.settings.controller)

  useEffect(() => {
    const store = useLibrary.getState
    let frame = 0
    // Remembered by id: the shelf re-renders covers (e.g. when the details panel makes room), so elements come and go.
    let lastGameId: string | null = null
    const lastGame = (): HTMLElement | null =>
      lastGameId ? document.querySelector<HTMLElement>(`[data-game-id="${CSS.escape(lastGameId)}"]`) : null
    const remember = (el: HTMLElement): void => {
      lastGameId = el.dataset.gameId ?? lastGameId
    }
    const prev: boolean[] = []
    const dirs: Record<Direction, Repeater> = {
      up: new Repeater(),
      down: new Repeater(),
      left: new Repeater(),
      right: new Repeater()
    }
    const pages = { up: new Repeater(450, 220), down: new Repeater(450, 220) }

    const setActive = (on: boolean): void => {
      document.body.classList.toggle('gamepad', on)
    }
    const onMouse = (): void => setActive(false)

    const move = (dir: Direction): void => {
      const { root } = currentLayer()
      const current = document.activeElement as HTMLElement | null
      const candidates = focusables(root)
      if (!current || current === document.body || !candidates.includes(current)) {
        const start = (root === document.body ? lastGame() : null) ?? firstGame(root)
        if (start) focus(start)
        return
      }
      const next = pickNext(
        current.getBoundingClientRect(),
        candidates.filter((c) => c !== current).map((item) => ({ item, rect: item.getBoundingClientRect() })),
        dir
      )
      if (next) focus(next)
    }

    const focusedGame = (): HTMLElement | null => {
      const el = document.activeElement as HTMLElement | null
      return el?.matches(GAME) ? el : null
    }

    const press = (button: number): void => {
      const s = store()
      const el = document.activeElement as HTMLElement | null
      switch (button) {
        case BTN.A: {
          if (!el || el === document.body) return move('down')
          const game = focusedGame()
          el.click()
          if (game) {
            remember(game)
            // Hand focus to the details panel's Play button, so pressing A again plays.
            window.setTimeout(() => {
              const play = document.querySelector<HTMLElement>('.drawer [data-autofocus]')
              if (play) focus(play)
            }, 450)
          }
          return
        }
        case BTN.X: {
          const game = focusedGame()
          if (game) return key(game, 'Enter')
          if (el?.closest('.drawer')) document.querySelector<HTMLElement>('.drawer [data-autofocus]')?.click()
          return
        }
        case BTN.Y: {
          const game = focusedGame()
          if (!game) return
          remember(game)
          const r = game.getBoundingClientRect()
          game.dispatchEvent(
            new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              clientX: r.left + r.width / 2,
              clientY: r.top + 40
            })
          )
          window.setTimeout(() => {
            const first = document.querySelector<HTMLElement>('.context-menu .menu-item')
            if (first) focus(first)
          }, 60)
          return
        }
        case BTN.B: {
          const wasIn = currentLayer().context
          key(el && el !== document.body ? el : document.body, 'Escape')
          // Back on the shelf, return to the game you came from. Closing layers animate out, so focus may
          // still sit inside one for a moment; only the open (non-closing) layers matter here.
          window.setTimeout(() => {
            const now = document.activeElement
            const lost = !now || now === document.body || !(now as HTMLElement).isConnected
            const layerOpen = document.querySelector('.dialog, .context-menu, .settings-page, .toolbar .popover')
            const back = lastGame()
            if ((lost || wasIn === 'drawer' || wasIn === 'menu') && !layerOpen && back) focus(back)
          }, 80)
          return
        }
        case BTN.LB:
        case BTN.RB: {
          const present = SERVICES.filter((svc) => s.library.games.some((g) => g.service === svc && !g.hidden))
          const order: (Service | null)[] = [null, ...present]
          const cur = s.settings.services.length === 1 ? s.settings.services[0] : null
          const i = Math.max(0, order.indexOf(cur))
          const next = order[(i + (button === BTN.RB ? 1 : order.length - 1)) % order.length]
          s.updateSettings({ services: next ? [next] : [] })
          return
        }
        case BTN.VIEW:
          s.updateSettings({ layout: s.settings.layout === 'flat' ? 'stacked' : 'flat' })
          return
        case BTN.MENU: {
          const opening = !s.settingsOpen
          s.setSettingsOpen(opening)
          if (opening)
            window.setTimeout(() => {
              const first = document.querySelector<HTMLElement>('.settings-nav .nav-item')
              if (first) focus(first)
            }, 120)
          else
            window.setTimeout(() => {
              const back = lastGame()
              if (back) focus(back)
            }, 120)
          return
        }
      }
    }

    const tick = (now: number): void => {
      frame = requestAnimationFrame(tick)
      const pad = [...navigator.getGamepads()].find((p) => p && p.connected)
      if (!pad) return
      const btn = (i: number): boolean => !!pad.buttons[i]?.pressed
      const [lx = 0, ly = 0, , ry = 0] = pad.axes
      let any = false

      const held: Record<Direction, boolean> = {
        up: btn(BTN.UP) || ly < -STICK_DEADZONE,
        down: btn(BTN.DOWN) || ly > STICK_DEADZONE,
        left: btn(BTN.LEFT) || lx < -STICK_DEADZONE,
        right: btn(BTN.RIGHT) || lx > STICK_DEADZONE
      }
      for (const d of Object.keys(dirs) as Direction[]) {
        if (held[d]) any = true
        if (dirs[d].update(held[d], now)) move(d)
      }
      // Triggers jump about a screen's worth of rows.
      for (const [d, b] of [
        ['up', BTN.LT],
        ['down', BTN.RT]
      ] as const) {
        if (btn(b)) any = true
        if (pages[d].update(btn(b), now)) for (let i = 0; i < 3; i++) move(d)
      }
      for (const b of [BTN.A, BTN.B, BTN.X, BTN.Y, BTN.LB, BTN.RB, BTN.VIEW, BTN.MENU]) {
        const down = btn(b)
        if (down) any = true
        if (down && !prev[b]) press(b)
        prev[b] = down
      }
      // Right stick scrolls whatever is scrollable in the current layer.
      if (Math.abs(ry) > 0.2) {
        any = true
        const scroller = document.querySelector('.settings-scroll') ?? document.querySelector('.stage')
        scroller?.scrollBy({ top: ry * 22 })
      }
      if (any) setActive(true)

      const el = document.activeElement
      if (el && el.matches(GAME)) remember(el as HTMLElement)
      store().setController({ context: currentLayer().context })
    }

    const connected = (): Gamepad | undefined => [...navigator.getGamepads()].find((p) => p && p.connected) ?? undefined
    const start = (): void => {
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const stop = (): void => {
      cancelAnimationFrame(frame)
      frame = 0
    }

    const onConnect = (e: GamepadEvent): void => {
      store().setController({ connected: true, name: e.gamepad.id })
      store().toast('Controller connected')
      start()
    }
    const onDisconnect = (): void => {
      const pad = connected()
      store().setController({ connected: !!pad, name: pad?.id })
      if (!pad) {
        store().toast('Controller disconnected')
        setActive(false)
        stop()
      }
    }

    if (!enabled) {
      store().setController({ connected: false, name: undefined })
      return
    }
    window.addEventListener('gamepadconnected', onConnect)
    window.addEventListener('gamepaddisconnected', onDisconnect)
    window.addEventListener('mousemove', onMouse)
    const pad = connected()
    if (pad) {
      store().setController({ connected: true, name: pad.id })
      start()
    }
    return () => {
      stop()
      setActive(false)
      window.removeEventListener('gamepadconnected', onConnect)
      window.removeEventListener('gamepaddisconnected', onDisconnect)
      window.removeEventListener('mousemove', onMouse)
    }
  }, [enabled])
}
