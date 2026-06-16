import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NeonButton } from '@/components/ui/NeonButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/stores/authStore'
import { deleteAccount, signOut } from '@/lib/auth'

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const ownedPlot = useAuthStore((s) => s.ownedPlot)
  const initializing = useAuthStore((s) => s.initializing)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Protected route: bounce to /auth once we know there's no session.
  useEffect(() => {
    if (!initializing && !user) navigate('/auth', { replace: true })
  }, [initializing, user, navigate])

  if (initializing || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void">
        <p className="font-mono text-xs tracking-[0.4em] text-cyan/60 uppercase">
          loading…
        </p>
      </div>
    )
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await deleteAccount()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete account.')
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-void px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-xs tracking-[0.4em] text-magenta uppercase">
          FutureCity · dashboard
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-wide text-cyan">
          {profile?.username ?? 'Operator'}
        </h1>
        <p className="mt-2 font-mono text-sm text-muted">{user.email}</p>

        {/* Owned plot */}
        <section className="hud-panel mt-10 rounded-sm p-6">
          <h2 className="font-mono text-xs tracking-widest text-cyan/60 uppercase">
            Your Plot
          </h2>
          {ownedPlot ? (
            <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <span className="font-display text-2xl font-bold text-cyan">
                {ownedPlot.name}
              </span>
              <span className="font-mono text-sm text-amber uppercase">
                {ownedPlot.district}
              </span>
              <span className="font-mono text-sm text-cyan/70">
                grid {ownedPlot.grid_x}, {ownedPlot.grid_z}
              </span>
            </div>
          ) : (
            <p className="mt-3 font-mono text-sm text-muted">
              No plot assigned yet.
            </p>
          )}
          <NeonButton
            accent="cyan"
            onClick={() => navigate('/city')}
            className="mt-6 text-xs"
          >
            Enter the City →
          </NeonButton>
        </section>

        {/* Account actions */}
        <section className="mt-8 flex flex-col gap-4 border-t border-border pt-8">
          <button
            onClick={handleSignOut}
            className="self-start font-mono text-xs tracking-widest text-cyan/70 uppercase transition-colors hover:text-cyan"
          >
            ← Sign out
          </button>

          <div className="mt-4">
            <h2 className="font-mono text-xs tracking-widest text-magenta uppercase">
              Danger Zone
            </h2>
            <p className="mt-2 max-w-md font-mono text-xs leading-relaxed text-muted">
              Deleting your account is permanent. Your assets are removed and
              your plot is released back to the city for someone else to claim.
            </p>
            {error && (
              <p className="mt-3 font-mono text-xs text-magenta">{error}</p>
            )}
            <NeonButton
              accent="magenta"
              onClick={() => setConfirmOpen(true)}
              className="mt-4 text-xs"
            >
              Delete account
            </NeonButton>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        danger
        title="Delete account?"
        confirmLabel="Delete forever"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      >
        This permanently deletes <span className="text-cyan">{profile?.username ?? user.email}</span>,
        removes your assets, and releases your plot
        {ownedPlot ? ` (${ownedPlot.district} ${ownedPlot.grid_x},${ownedPlot.grid_z})` : ''}.
        This cannot be undone.
      </ConfirmDialog>
    </div>
  )
}
