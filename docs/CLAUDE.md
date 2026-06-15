# CLAUDE.md
## Cyberpunk City Explorer — Claude Code Instructions

---

### What This Project Is

A cyberpunk-themed web experience with two parts:
1. A cinematic scroll-driven landing page
2. A persistent 3D city world where authenticated users own plots and build voxel structures

Read `docs/prd.md` for product context. Read `docs/spec.md` for technical decisions, schema, and component architecture. This file tells you how to behave while building it.

---

### Decisions Log

Cross-phase decisions made during project planning, recorded here so they aren't relitigated:

- **Package manager**: npm
- **reactbits.dev**: vendor components on-demand via the `npx`-based component CLI into `src/components/reactbits/` — not an npm dependency
- **Supabase migrations**: SQL files live in `supabase/migrations/` but are applied manually via the Supabase SQL editor for now; a CLI-based workflow may be adopted later
- **Auth providers**: Phase 1 ships email/password only. Google OAuth is a deferred follow-up (requires Supabase + Google Cloud console setup)
- **Deployment**: Vercel deploy is deferred until the app works end-to-end locally
- **Version control**: git initialized at project start; `.gitignore` covers `node_modules`, `dist`, `.env.local`
- **Git authorship**: NEVER attribute commits to Claude/Anthropic. No `Co-Authored-By: Claude` trailer, no "Generated with Claude Code" line, and never set the commit author/committer to an Anthropic identity. Commits are authored solely by the user. (A prior project's `Co-Authored-By: Claude` trailer permanently registered Claude as a GitHub contributor — do not repeat this.)
- **Tooling**: ESLint only for now (extend Vite's React-TS template for strict TS, no `any`). Prettier and CI are deferred

---

### Build Order — Follow This Exactly

#### Phase 1
1. Scaffold Vite + React + TypeScript project
2. Install and configure: Tailwind, GSAP + ScrollTrigger, R3F + Drei, Zustand, Supabase client, reactbits.dev
3. Set up global CSS tokens (`src/styles/tokens.css`, `src/styles/globals.css`)
4. Set up fonts: Orbitron + Share Tech Mono via Google Fonts in `index.html`
5. Set up React Router with route stubs for `/`, `/city`, `/plot/:id`, `/builder`, `/auth`, `/dashboard`
6. Set up Supabase client (`src/lib/supabase.ts`)
7. Write and apply Supabase SQL migrations (schema from spec.md)
8. Build auth flow: sign up, log in, session persistence, plot auto-assignment
9. Build landing page `/`
10. Build city world shell `/city`
11. Build plot view `/plot/:id`

#### Phase 2
12. Build voxel builder `/builder`
13. Build asset library (save, load, thumbnail)
14. Build plot placement (place saved assets onto city plot)
15. Connect Supabase Realtime to city world

#### Phase 3
16. Social features (visiting, neon tags)
17. Community asset library

**Do not skip ahead. Complete and verify each step before the next.**

---

### Hard Rules

**Never break these:**

- All colors must come from CSS vars defined in `tokens.css`. No hardcoded hex values in components.
- No parallax card layouts anywhere on the landing page. Find another approach.
- All 3D geometry that repeats must use `<InstancedMesh>`. Never render 200 individual `<mesh>` components for plot tiles.
- Never put database queries directly in components. All Supabase calls go in hooks (`src/hooks/`) or store actions.
- TypeScript strict mode is on. No `any` types.
- All R3F components must be in files ending in `.r3f.tsx` or inside `src/components/r3f/`.
- GSAP ScrollTrigger must be registered once in `src/lib/gsap.ts` and imported from there — never re-registered.
- Zustand stores must not import from each other. Use hooks to compose.

---

### Landing Page Specific Rules

You have **creative latitude** on the landing page layout. The product owner intentionally did not spec the layout — make something that feels genuinely cinematic and unexpected.

What is locked:
- GSAP ScrollTrigger for scroll control (not CSS scroll-snap, not Framer Motion scroll)
- At least one R3F scene integrated into the scroll
- reactbits.dev components for atmospheric effects — use `<Noise>`, `<Particles>`, `<GlitchText>`, `<Aurora>` or equivalent
- Design tokens only — no off-palette colors
- Orbitron for all display text, Share Tech Mono for data/body text on landing
- Single CTA at the bottom: "Enter the City" → `/auth`

What is open:
- Number of scroll sections
- Copy and headlines
- Layout of each section
- Which reactbits components you use and how
- Whether the R3F scene is a city fly-over, a building reveal, something else

Take a real creative risk on the layout. Don't default to stacked full-height sections with a centered headline and subtext in each one.

---

### City World Rules

- Camera uses `<CameraControls>` from drei. Do not use `<OrbitControls>` — CameraControls gives programmatic control needed for fly-to-plot animation.
- On auth redirect to `/city`, camera must animate (fly) to the user's owned plot. Use `cameraControlsRef.current.setLookAt(...)` with a GSAP tween driving the transition.
- Plot tiles must be clickable. Clicking navigates to `/plot/:id`.
- District fog color must change across the grid based on `DISTRICTS` config in `src/constants/city.ts`.
- Rain is always on by default. Weather toggle lives in a HUD overlay, not inside the R3F scene logic.
- Day/night toggle changes: ambient light intensity, directional light color, fog density, neon emissive intensity. Drive this with a GSAP timeline that updates R3F uniforms — do not re-render the scene.

---

### Builder Rules

- Builder grid is bounded to plot dimensions (`PLOT_SIZE` from constants).
- Block placement uses raycasting against a invisible plane at each Y level. Current Y level is controlled by a HUD slider.
- Ghost block: semi-transparent block that follows the mouse cursor on the grid. Snaps to grid units.
- Right-click removes a block.
- Block types are defined in `src/types/voxel.ts`. Do not add block types not in that list without updating the type definition first.
- Save flow: user enters name in a modal → `builderStore.saveAsset(name)` → serializes blocks to JSON → uploads to Supabase Storage → inserts row in `assets` table → shows success toast.
- Thumbnail generation: use R3F's `gl.domElement.toDataURL()` after positioning camera for a good angle. Do this before the save modal closes.

---

### Component Conventions

```
PascalCase for all components
camelCase for hooks (useCity, useBuilder, useAuth)
SCREAMING_SNAKE for constants
kebab-case for CSS classes
```

- Shared UI components go in `src/components/ui/` — buttons, panels, modals, HUD elements, toasts
- R3F scene components go in `src/components/r3f/`
- Route-level page components go in `src/app/routes/`
- Do not put JSX in store files

---

### Environment Variables

Required in `.env.local`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Add `.env.local` to `.gitignore` immediately at project scaffold. Never commit keys.

---

### When You're Unsure

If a decision isn't covered by this file or the spec, apply this priority order:
1. What does the PRD say the product should feel like?
2. What serves 60fps performance?
3. What is simpler to implement correctly?
4. What looks more impressive in a demo?

When in genuine doubt between two technical approaches, pick the one with less state to manage.

---

### Definition of Done (Phase 1)

- [ ] Landing page loads, scroll animations work, CTA navigates to `/auth`
- [ ] Sign up creates a user, assigns a plot, redirects to `/city`
- [ ] Log in restores session, redirects to `/city`
- [ ] City world renders 200 plot tiles in correct grid layout
- [ ] Camera flies to user's owned plot on load
- [ ] Clicking a plot navigates to `/plot/:id`
- [ ] Plot view shows claimed/unclaimed state correctly
- [ ] Day/night toggle works
- [ ] Rain system runs without frame drops
- [ ] No TypeScript errors (`tsc --noEmit` passes clean)
- [ ] Deployed to Vercel and accessible via public URL
