/**
 * JS/WebGL mirror of the locked tokens.css palette.
 *
 * CSS/HTML must consume colors via Tailwind token utilities (bg-void, text-cyan)
 * or var(--color-*). But three.js / OGL / canvas / reactbits color props can't
 * read CSS variables — they need literal values. This is the SINGLE source for
 * those contexts; keep it in sync with src/styles/tokens.css.
 */
export const PALETTE = {
  void: '#0a0a0f',
  cyan: '#00ffe7',
  magenta: '#ff2d78',
  amber: '#ffd700',
  purple: '#1a0033',
  surface: '#0f0f1a',
  border: '#1e1e3a',
  muted: '#3a3a5c',
} as const

export type PaletteKey = keyof typeof PALETTE
