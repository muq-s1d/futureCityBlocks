# Implementation Tracker

Tracks build progress against the plans in `docs/CLAUDE.md` and `docs/spec.md`. Check items off as they're completed.

---

## Phase 1 — Scaffold, Auth, Landing, City Shell

Detailed plan — Build Order steps 1–14 from `docs/CLAUDE.md`, using the decisions recorded in the Decisions Log.

- [ ] **1. Scaffold**: `npm create vite@latest . -- --template react-ts`, `git init`, `.gitignore` (`node_modules`, `dist`, `.env.local`)
- [ ] **2. Install deps**: Tailwind, GSAP (+ScrollTrigger), `@react-three/fiber` + `@react-three/drei` + `three`, Zustand, `@supabase/supabase-js`, `react-router-dom`; configure Tailwind
- [ ] **3. Folder structure**: `src/app/routes`, `src/components/{landing,city,builder,ui,r3f,reactbits}`, `src/hooks`, `src/stores`, `src/lib`, `src/types`, `src/constants`, `src/styles`, `supabase/migrations`
- [ ] **4. Design tokens**: `src/styles/tokens.css` (palette/typography from spec) and `src/styles/globals.css` (reset + token usage)
- [ ] **5. Fonts**: Orbitron, Share Tech Mono, Inter via Google Fonts `<link>` in `index.html`
- [ ] **6. Routing**: React Router stubs for `/`, `/city`, `/plot/:id`, `/builder`, `/auth`, `/dashboard` with `Suspense` + `lazy`
- [ ] **7. Supabase client**: `src/lib/supabase.ts`, `.env.local` (gitignored) with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- [ ] **8. Supabase project + schema**:
  - [ ] User creates Supabase project via dashboard, supplies URL/anon key
  - [ ] Write SQL migrations in `supabase/migrations/` for `profiles`, `plots`, `assets`, `plot_objects`, RLS policies, and the signup trigger (auto-create profile + assign oldest unclaimed plot)
  - [ ] Apply migrations via Supabase SQL editor
- [ ] **9. GSAP setup**: `src/lib/gsap.ts` registering `ScrollTrigger` once
- [ ] **10. Zustand stores**: typed shells for `authStore`, `cityStore`, `builderStore` per spec interfaces (builder store stubbed until Phase 2)
- [ ] **11. Auth flow** (`/auth`): email/password sign up + log in via Supabase Auth, session persistence (`authStore` + `onAuthStateChange`), redirect to `/city`
- [ ] **12. Landing page** (`/`): GSAP ScrollTrigger scroll experience, ≥1 R3F scene, reactbits.dev atmospheric components (via `npx` CLI), tokens-only styling, single "Enter the City" CTA → `/auth`
- [ ] **13. City world shell** (`/city`): `<CityScene>` with `<CameraControls>`, 200 plot tiles via `<InstancedMesh>`, district fog from `DISTRICTS`, rain system (HUD toggle), day/night GSAP timeline, camera fly-to-owned-plot, click → `/plot/:id`
- [ ] **14. Plot view** (`/plot/:id`): claimed/unclaimed state, renders placed assets or empty state

### Phase 1 Definition of Done

- [ ] `npm run dev` runs clean, `tsc --noEmit` and `npm run lint` pass
- [ ] Landing page loads, scroll animations work, CTA → `/auth`
- [ ] Sign up creates user + profile + auto-assigns a plot, redirects to `/city`
- [ ] Log in restores session, redirects to `/city`
- [ ] City world renders 200 plot tiles in correct grid/district layout
- [ ] Camera flies to the user's owned plot on load
- [ ] Clicking a plot navigates to `/plot/:id`, shows correct claimed/unclaimed state
- [ ] Day/night toggle and rain system work without frame drops

---

## Phase 2 — Voxel Builder (not yet planned in detail)

High-level scope from `docs/prd.md` / `docs/CLAUDE.md`. Will get a detailed step-by-step plan once Phase 1 is complete.

- [ ] Voxel builder scene (`/builder`) — bounded grid, raycast place/remove, ghost block, Y-level HUD slider
- [ ] Block palette and types per `src/types/voxel.ts`
- [ ] Save flow: name asset → serialize to JSON → upload to Supabase Storage → insert `assets` row → thumbnail
- [ ] Asset library panel (saved assets, thumbnails)
- [ ] Plot placement: place saved assets onto owned plot (`plot_objects`)
- [ ] Supabase Realtime wired into city world (live updates as owners build)

---

## Phase 3 — Social + Live City (not yet planned in detail)

High-level scope only — to be planned after Phase 2.

- [ ] Visit other users' plots (fly-in animation)
- [ ] Plot profile: username, plot name, visitor count
- [ ] Neon tags (graffiti comments) on plots
- [ ] Community asset library: browse/fork public assets

---

## Deferred / Follow-up Items

- [ ] Google OAuth (Supabase + Google Cloud console setup)
- [ ] Vercel deployment
- [ ] Supabase CLI-based migration workflow (currently manual via SQL editor)
- [ ] Prettier + CI (currently ESLint only)
