/** Button indices of the W3C "standard" gamepad mapping, which Xbox controllers use. */
export const BTN = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  VIEW: 8,
  MENU: 9,
  LS: 10,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15
} as const

export const STICK_DEADZONE = 0.5

/**
 * Turns a held input into presses: fires once when pressed, then repeats while held
 * (after `delay` ms, every `interval` ms), like a keyboard key.
 */
export class Repeater {
  private downSince: number | null = null
  private lastFire = 0

  constructor(
    private readonly delay = 380,
    private readonly interval = 110
  ) {}

  update(pressed: boolean, now: number): boolean {
    if (!pressed) {
      this.downSince = null
      return false
    }
    if (this.downSince === null) {
      this.downSince = now
      this.lastFire = now
      return true
    }
    if (now - this.downSince >= this.delay && now - this.lastFire >= this.interval) {
      this.lastFire = now
      return true
    }
    return false
  }
}
