import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { NeonButton } from '@/components/ui/NeonButton'

interface ConfirmDialogProps {
  open: boolean
  title: string
  /** Body copy / warning. */
  children: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Red styling for destructive actions. */
  danger?: boolean
  /** Disables buttons + shows pending state while the action runs. */
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Accessible modal confirmation popup. Backdrop click, Escape, and Cancel all
 * dismiss; Confirm runs the action. Used for irreversible actions like account
 * deletion. Tokens-only cyberpunk styling.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={() => !busy && onCancel()}
        aria-hidden
      />

      <div className="hud-panel relative z-10 w-full max-w-md rounded-sm p-7">
        <h2
          id="confirm-title"
          className={`font-display text-2xl font-bold tracking-wide ${
            danger ? 'text-magenta' : 'text-cyan'
          }`}
        >
          {title}
        </h2>

        <div className="mt-4 font-mono text-sm leading-relaxed text-cyan/80">
          {children}
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <NeonButton
            accent="cyan"
            onClick={onCancel}
            disabled={busy}
            className="px-6 py-3 text-xs"
          >
            {cancelLabel}
          </NeonButton>
          <NeonButton
            ref={confirmRef}
            accent={danger ? 'magenta' : 'cyan'}
            onClick={onConfirm}
            disabled={busy}
            className="px-6 py-3 text-xs"
          >
            {busy ? 'Working…' : confirmLabel}
          </NeonButton>
        </div>
      </div>
    </div>
  )
}
