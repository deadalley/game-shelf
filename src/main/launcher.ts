import { spawn } from 'node:child_process'
import { dirname } from 'node:path'
import { shell } from 'electron'
import type { LaunchSpec } from '@shared/types'
import { splitArgs } from './util/args'

/** Sessions shorter than this are almost certainly a stub that handed off to a launcher. */
const MIN_TRACKED_MS = 60_000

export interface LaunchOptions {
  /** Called with the measured session when the process exits (exe launches only). */
  onSessionEnd?: (minutes: number) => void
}

export async function launch(spec: LaunchSpec, opts: LaunchOptions = {}): Promise<void> {
  if (spec.type === 'uri') {
    if (spec.target.toLowerCase().startsWith('shell:')) {
      spawn('explorer.exe', [spec.target], { detached: true, stdio: 'ignore' }).unref()
    } else {
      await shell.openExternal(spec.target)
    }
    return
  }

  await new Promise<void>((resolve, reject) => {
    const started = Date.now()
    const child = spawn(spec.target, splitArgs(spec.args), {
      cwd: dirname(spec.target),
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    })
    child.once('error', reject)
    child.once('spawn', () => resolve())
    child.once('exit', () => {
      const ms = Date.now() - started
      if (ms >= MIN_TRACKED_MS) opts.onSessionEnd?.(Math.round(ms / 60_000))
    })
    child.unref()
  })
}
