import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

const NAV: { to: string; label: string }[] = [
  { to: '/', label: 'Landing' },
  { to: '/auth', label: 'Auth' },
  { to: '/city', label: 'City' },
  { to: '/plot/1', label: 'Plot' },
  { to: '/builder', label: 'Builder' },
  { to: '/dashboard', label: 'Dashboard' },
]

/**
 * Temporary placeholder shell for routes that are not yet built out.
 * Replaced screen-by-screen as the Phase 1 build progresses.
 */
export function PageStub({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 bg-void px-6 py-16 text-center">
      <p className="font-mono text-xs tracking-[0.4em] text-magenta uppercase">
        FutureCity · stub
      </p>
      <h1 className="font-display text-4xl font-bold tracking-wide text-cyan">
        {title}
      </h1>
      {children}
      <nav className="flex flex-wrap items-center justify-center gap-4">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded border border-border px-3 py-1 font-mono text-xs tracking-widest text-cyan/80 uppercase transition-colors hover:border-cyan hover:text-cyan"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
