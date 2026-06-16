import GlitchText from '@/components/reactbits/GlitchText/GlitchText'
import { AuthForm } from '@/components/auth/AuthForm'

/** Standalone /auth route (direct link / fallback). The primary entry point is
 *  the in-world sign panel reached from the landing "Enter the City" CTA. */
export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-void px-6 py-16">
      <div className="mb-10 text-center">
        <GlitchText speed={1.6} shadowIntensity={2} className="!text-4xl sm:!text-5xl font-display">
          FUTURECITY
        </GlitchText>
        <p className="mt-4 font-mono text-xs tracking-[0.4em] text-cyan/60 uppercase">
          access the grid
        </p>
      </div>
      <AuthForm />
    </div>
  )
}
