import { useEffect, useRef, type RefObject } from 'react'

/**
 * Decorative HUD overlay: corner brackets + monospace readouts. The altitude
 * value tracks scroll progress via rAF (DOM text only — no React re-render).
 */
export function HudFrame({ progress }: { progress: RefObject<number> }) {
  const altRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const p = progress.current ?? 0
      if (altRef.current) {
        const alt = Math.round((1 - p) * 980 + 4) // 0984m aerial → 0004m street
        altRef.current.textContent = String(alt).padStart(4, '0')
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [progress])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 font-mono text-[0.65rem] tracking-[0.2em] text-cyan/55 uppercase"
      aria-hidden
    >
      {/* corner brackets */}
      <span className="absolute top-5 left-5 h-6 w-6 border-t border-l border-cyan/40" />
      <span className="absolute top-5 right-5 h-6 w-6 border-t border-r border-cyan/40" />
      <span className="absolute bottom-5 left-5 h-6 w-6 border-b border-l border-cyan/40" />
      <span className="absolute right-5 bottom-5 h-6 w-6 border-r border-b border-cyan/40" />

      {/* top readouts */}
      <div className="absolute top-5 left-14 flex items-center gap-2">
        <span className="text-magenta animate-flicker">●</span>
        <span>FUTURECITY // GRID-200</span>
      </div>
      <div className="absolute top-5 right-14">
        ALT <span ref={altRef}>0984</span> M
      </div>

      {/* bottom readouts */}
      <div className="absolute bottom-5 left-14">LAT 35.689 · LON 139.692</div>
      <div className="absolute right-14 bottom-5">SECTOR · TOKYO-3 SHARD</div>
    </div>
  )
}
