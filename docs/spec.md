# Technical Specification
## Cyberpunk City Explorer

---

### Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| 3D Engine | React Three Fiber (R3F) + Drei |
| Scroll / Animation | GSAP + ScrollTrigger |
| Atmosphere Components | reactbits.dev |
| Styling | Tailwind CSS + CSS custom properties |
| State Management | Zustand |
| Auth + Database | Supabase |
| Deployment | Vercel |

---

### Project Structure

```
/
├── docs/
│   ├── prd.md
│   ├── spec.md
│   └── CLAUDE.md
├── src/
│   ├── app/
│   │   ├── routes/          # React Router route components
│   │   └── App.tsx
│   ├── components/
│   │   ├── landing/         # Landing page sections
│   │   ├── city/            # City world components
│   │   ├── builder/         # Voxel builder components
│   │   ├── ui/              # Shared UI (buttons, panels, HUD elements)
│   │   ├── r3f/             # Shared R3F scene components
│   │   └── reactbits/       # Components vendored via reactbits.dev CLI (npx)
│   ├── hooks/               # Custom React hooks
│   ├── stores/              # Zustand stores
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client
│   │   └── gsap.ts          # GSAP registrations
│   ├── types/               # TypeScript types
│   ├── constants/           # City grid config, block types, district data
│   └── styles/
│       ├── globals.css      # CSS vars, base reset
│       └── tokens.css       # Design tokens
├── public/
│   └── fonts/
├── supabase/
│   └── migrations/          # SQL migration files
└── vite.config.ts
```

---

### Design Tokens

```css
:root {
  /* Palette */
  --color-void:       #0a0a0f;
  --color-cyan:       #00ffe7;
  --color-magenta:    #ff2d78;
  --color-amber:      #ffd700;
  --color-purple:     #1a0033;
  --color-surface:    #0f0f1a;
  --color-border:     #1e1e3a;
  --color-muted:      #3a3a5c;

  /* Typography */
  --font-display:     'Orbitron', sans-serif;
  --font-mono:        'Share Tech Mono', monospace;
  --font-ui:          'Inter', sans-serif;

  /* Spacing scale follows Tailwind defaults */

  /* Glow utilities */
  --glow-cyan:   0 0 20px #00ffe780;
  --glow-magenta: 0 0 20px #ff2d7880;
}
```

---

### Database Schema (Supabase / Postgres)

```sql
-- Users (extends Supabase auth.users)
create table public.profiles (
  id          uuid references auth.users primary key,
  username    text unique not null,
  created_at  timestamptz default now()
);

-- Plots
create table public.plots (
  id          serial primary key,
  owner_id    uuid references public.profiles(id),
  district    text not null,
  grid_x      int not null,
  grid_z      int not null,
  name        text default 'Unnamed Plot',
  claimed_at  timestamptz,
  unique(grid_x, grid_z)
);

-- Voxel Assets (user-created structures)
create table public.assets (
  id          uuid default gen_random_uuid() primary key,
  owner_id    uuid references public.profiles(id) not null,
  name        text not null,
  voxel_data  jsonb not null,       -- array of {x,y,z,type,color}
  thumbnail   text,                  -- Supabase Storage URL
  is_public   boolean default false,
  created_at  timestamptz default now()
);

-- Plot Objects (assets placed on plots)
create table public.plot_objects (
  id          uuid default gen_random_uuid() primary key,
  plot_id     int references public.plots(id) not null,
  asset_id    uuid references public.assets(id) not null,
  pos_x       float not null,
  pos_y       float not null,
  pos_z       float not null,
  rot_y       float default 0,
  placed_at   timestamptz default now()
);
```

**Row Level Security:**
- `profiles`: read public, write own row only
- `plots`: read public, write own plot only
- `assets`: read if public or owner, write own only
- `plot_objects`: read public, write if plot owner

**Migration workflow:** SQL migration files live in `supabase/migrations/` as the source of truth, but are applied manually via the Supabase SQL editor for now. A CLI-based (`supabase db push`) workflow may be adopted later.

---

### City Grid

```ts
// constants/city.ts

export const CITY_CONFIG = {
  GRID_COLS: 20,
  GRID_ROWS: 10,
  TOTAL_PLOTS: 200,
  PLOT_SIZE: 10,       // world units per plot
  PLOT_GAP: 1,         // gap between plots (roads)
}

export const DISTRICTS = [
  { id: 'neon',       label: 'Neon District',    color: '#00ffe7', gridRange: { xMin: 0,  xMax: 6  } },
  { id: 'corporate',  label: 'Corporate Zone',   color: '#ffd700', gridRange: { xMin: 7,  xMax: 12 } },
  { id: 'underground',label: 'Underground',       color: '#ff2d78', gridRange: { xMin: 13, xMax: 19 } },
]
```

---

### Voxel Data Format

```ts
// types/voxel.ts

export type BlockType =
  | 'concrete'
  | 'glass'
  | 'neon_cyan'
  | 'neon_magenta'
  | 'metal'
  | 'signage'
  | 'light'

export interface VoxelBlock {
  x: number   // grid position within asset bounds
  y: number
  z: number
  type: BlockType
  color?: string  // override for neon/signage blocks
}

export interface VoxelAsset {
  id: string
  name: string
  blocks: VoxelBlock[]
  bounds: { w: number; h: number; d: number }
}
```

---

### Zustand Stores

```ts
// stores/cityStore.ts
interface CityStore {
  plots: Plot[]
  selectedPlot: Plot | null
  timeOfDay: 'day' | 'night'
  weather: 'clear' | 'rain'
  setSelectedPlot: (plot: Plot | null) => void
  toggleTimeOfDay: () => void
}

// stores/builderStore.ts
interface BuilderStore {
  blocks: VoxelBlock[]
  selectedBlockType: BlockType
  placeBlock: (block: VoxelBlock) => void
  removeBlock: (x: number, y: number, z: number) => void
  clearAll: () => void
  saveAsset: (name: string) => Promise<void>
}

// stores/authStore.ts
interface AuthStore {
  user: User | null
  profile: Profile | null
  ownedPlot: Plot | null
  setUser: (user: User | null) => void
}
```

---

### Key R3F Components

**`<CityScene />`**
- Loads all 200 plot meshes from DB on mount
- `<fog>` color shifts per district
- `<Rain />` — instanced Points with downward velocity
- `<CameraControls />` from drei — smooth orbit + pan
- `<PlotMesh />` per plot — click handler → navigate to `/plot/:id`

**`<PlotMesh />`**
- Renders claimed plots: iterate `plot_objects`, place `<AssetMesh />` per object
- Renders unclaimed plots: dim emissive tile with "UNCLAIMED" hologram text
- Hover state: cyan outline via `<Outlines />` from drei

**`<AssetMesh />`**
- Takes `VoxelAsset` data, renders `<InstancedMesh>` per block type
- Batches same-type blocks into one draw call per type

**`<BuilderScene />`**
- Bounded grid (plot dimensions)
- Raycaster for click-to-place, right-click-to-remove
- Ghost block follows cursor
- `<BuilderGrid />` — XZ plane grid lines
- Camera: fixed perspective, orbit limited to builder bounds

---

### Landing Page Architecture

Landing is intentionally spec'd loosely — Claude Code has creative latitude. Hard requirements only:

1. GSAP ScrollTrigger scroll-driven — NOT CSS scroll-snap
2. At least one R3F scene (aerial city or fly-in reveal)
3. Use reactbits.dev components for atmospheric effects (glitch, particles, etc.)
4. Zero parallax cards — find a different way to present features
5. Single CTA at the end: "Enter the City" → `/auth`
6. Must use design tokens above — no off-palette colors
7. Fonts: Orbitron + Share Tech Mono only on landing

Everything else — layout, number of sections, copy, specific components — is open.

---

### GSAP Setup

```ts
// lib/gsap.ts
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }
```

Scroll container is `document.documentElement`. Pin sections using `pin: true` on ScrollTrigger. Use `scrub: 1.2` for cinematic feel. Avoid `scrub: true` (too direct).

---

### Supabase Client

```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

`.env` variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

### Auth Flow

1. User signs up → Supabase creates `auth.users` row
2. Supabase trigger auto-creates `profiles` row
3. On profile create trigger → find oldest unclaimed plot → assign `owner_id`
4. Frontend on login: fetch `profiles` + `plots` where `owner_id = user.id`
5. Redirect to `/city`, fly camera to owned plot

**Note:** Phase 1 ships email/password auth only. Google OAuth is a deferred follow-up requiring additional Supabase + Google Cloud console configuration.

---

### Performance Targets

| Metric | Target |
|---|---|
| Landing FCP | < 1.5s |
| City world initial load | < 3s |
| City world FPS | 60fps sustained (mid-tier GPU) |
| Builder FPS | 60fps up to 500 blocks |
| Supabase query (plot load) | < 200ms |

**Optimization notes:**
- Use `<InstancedMesh>` for all repeated geometry (blocks, rain, plot tiles)
- Lazy-load city plot data in viewport chunks
- R3F `frameloop="demand"` on landing page (only render when animating)
- Suspense + lazy on all route components
