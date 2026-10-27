import type { Service } from '@shared/types'

/** Identification colours for each service (dots and placeholders), not brand assets. */
export const SERVICE_COLORS: Record<Service, string> = {
  steam: '#4c8fc4',
  xbox: '#2f9e44',
  gog: '#9b59b6',
  epic: '#8d8d8d',
  ea: '#e5534b',
  ubisoft: '#3b82f6',
  battlenet: '#21a3e6',
  custom: '#c08a4a'
}

const PLACEHOLDER_TONES = [
  ['#3d3a36', '#6e665b'],
  ['#2f3640', '#5b6676'],
  ['#3a3340', '#6a5e75'],
  ['#2f3a35', '#5a6d62'],
  ['#40342e', '#7a6355'],
  ['#2e3440', '#4c566a']
]

export function placeholderTone(name: string): [string, string] {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PLACEHOLDER_TONES[h % PLACEHOLDER_TONES.length] as [string, string]
}
