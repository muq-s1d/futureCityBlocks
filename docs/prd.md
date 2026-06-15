# Product Requirements Document
## Cyberpunk City Explorer

---

### Overview

A cyberpunk-themed interactive web experience consisting of two connected products:

1. **Landing Page** — A cinematic, scroll-driven showcase that introduces the city world and drives users to sign up and claim a plot.
2. **City World + Builder** — A persistent 3D city on a grid of ~200 plots divided into districts. Authenticated users own a plot, build structures using a voxel block editor, save reusable assets, and see other users' creations in the shared world.

The aesthetic is dark, neon-lit, rain-soaked cyberpunk. Not retro-futurism, not synthwave — gritty, dense, urban. Think Blade Runner 2049 meets a browser game.

---

### Goals

- Showcase technical ambition: cinematic scroll, real-time 3D, user-generated content
- Portfolio-grade project with genuine product depth
- Scalable to a community product (user plots, social visiting, asset sharing)
- Fast enough to run in-browser without native installs

---

### Users

**Visitor** — lands on the page, watches the cinematic scroll, clicks CTA, signs up
**Resident** — authenticated user, owns a plot, builds structures, visits other plots
**Explorer** — authenticated or not, can fly through the city and view other plots (read-only)

---

### Routes

| Route | Description |
|---|---|
| `/` | Landing page — cinematic scroll experience |
| `/city` | Full 3D city world, 200-plot grid |
| `/plot/:id` | Focused view of a single plot |
| `/builder` | Voxel builder environment |
| `/auth` | Sign up / log in |
| `/dashboard` | User's plot, asset library, settings |

---

### Phase 1 — Landing + City Shell + Auth

**Landing Page (`/`)**
- Full-page scroll-driven cinematic experience
- GSAP ScrollTrigger controls pacing — no parallax cards
- reactbits.dev components for atmosphere: glitch text, particles, noise, aurora, etc.
- R3F used for at least one 3D moment (aerial city reveal or fly-in)
- Creative direction is intentionally open — Claude Code has latitude on layout
- Ends with a single strong CTA: "Enter the City" → `/auth` or `/city`
- Locked aesthetic tokens: void black `#0a0a0f`, cyan `#00ffe7`, magenta `#ff2d78`, amber `#ffd700`, deep purple `#1a0033`
- Typography: Orbitron (display), Share Tech Mono (body/data)

**Auth (`/auth`)**
- Supabase Auth — email/password + Google OAuth
- On first sign-up: auto-assign user an unclaimed plot from the pool
- Redirect to `/city` after auth, camera flies to their plot

**City World (`/city`)**
- R3F scene, top-down perspective with orbit controls
- 200 plots arranged in a grid, divided into named districts
- District zones have different ambient lighting/fog color
- Unclaimed plots: dim, empty tiles
- Claimed plots: show whatever the owner has built
- Click a plot → `/plot/:id`
- Flying camera with smooth damping (drei `CameraControls`)
- Rain particle system, dynamic fog
- Day/night toggle (global GSAP timeline)

---

### Phase 2 — Voxel Builder

**Builder (`/builder`)**
- 3D voxel editor environment (R3F)
- Grid-snapped block placement on a bounded tile (same dimensions as a city plot)
- Block palette: cube types with different materials/colors (neon, concrete, glass, metal, signage)
- Place, remove, rotate blocks
- Name the creation → save as a reusable **Asset** (stored as JSON voxel data in Supabase Storage)
- Asset library panel: all your saved assets, thumbnail previews
- Assets can be placed on your plot in the city

**Asset System**
- Each asset = named JSON blob of block positions + types
- Thumbnail auto-generated (R3F canvas screenshot)
- Assets are private by default, shareable flag for community library (Phase 3)

---

### Phase 3 — Social + Live City

- Visit other users' plots (fly-in animation)
- Supabase Realtime: plots update live when owners make changes
- Community asset library: browse and fork other users' public assets
- Plot profile: username, plot name, visitor count
- Basic social: leave a neon tag (graffiti comment) on someone's plot

---

### Non-Goals (v1)

- No cryptocurrency, NFTs, or blockchain
- No real-time multiplayer presence (Phase 3)
- No mobile-first layout (desktop experience, mobile is degraded-graceful)
- No monetization in Phase 1 or 2

---

### Success Metrics (portfolio context)

- Landing page load < 3s on fast 3G
- City world maintains 60fps on mid-tier laptop GPU
- Builder allows saving and reloading a voxel asset correctly
- Auth + plot claim flow works end-to-end
- Looks genuinely impressive in a 60-second screen recording demo
