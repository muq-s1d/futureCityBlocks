/** Suspense fallback shown while a lazily-loaded route chunk is resolving. */
export function RouteFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-void">
      <span className="font-mono text-sm tracking-[0.3em] text-cyan/70 uppercase animate-pulse">
        Loading…
      </span>
    </div>
  )
}
