import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

type Accent = 'cyan' | 'magenta'

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  accent?: Accent
  children: ReactNode
  /** React 19 ref-as-prop (e.g. autofocus in a dialog). */
  ref?: Ref<HTMLButtonElement>
}

const ACCENT: Record<Accent, string> = {
  cyan: 'border-cyan text-cyan hover:bg-cyan/10 hover:shadow-glow-cyan',
  magenta: 'border-magenta text-magenta hover:bg-magenta/10 hover:shadow-glow-magenta',
}

/** Shared cyberpunk action button. Token-driven; reused by landing + auth. */
export function NeonButton({
  accent = 'cyan',
  children,
  className = '',
  ...props
}: NeonButtonProps) {
  return (
    <button
      className={`group inline-flex cursor-pointer items-center gap-3 border bg-transparent px-8 py-4 font-display text-sm font-bold tracking-[0.25em] uppercase transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-50 ${ACCENT[accent]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
