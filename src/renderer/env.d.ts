import type { GameShelfApi } from '@shared/types'

declare global {
  interface Window {
    gameshelf: GameShelfApi
  }
}

export {}
