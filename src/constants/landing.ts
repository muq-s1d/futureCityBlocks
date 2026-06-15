/** Landing-page copy. Kept out of components so sections stay presentational. */

export interface DistrictBlurb {
  id: string
  index: string // HUD-style ordinal
  label: string
  tagline: string
  body: string
  colorKey: 'cyan' | 'amber' | 'magenta'
}

export const DISTRICT_BLURBS: DistrictBlurb[] = [
  {
    id: 'neon',
    index: 'D-01',
    label: 'Neon District',
    tagline: 'Where the signal never sleeps',
    body: 'Dense, electric, overbuilt. Holographic signage stacked forty storeys high. The loudest plots in the grid.',
    colorKey: 'cyan',
  },
  {
    id: 'corporate',
    index: 'D-02',
    label: 'Corporate Zone',
    tagline: 'Glass towers, gold light',
    body: 'Cold, vertical, immaculate. Amber spotlights rake monolithic facades. Prestige addresses for the precise.',
    colorKey: 'amber',
  },
  {
    id: 'underground',
    index: 'D-03',
    label: 'Underground',
    tagline: 'Below the floodline',
    body: 'Magenta haze and improvised wiring. The grid’s rough edge, rebuilt nightly by whoever claims it first.',
    colorKey: 'magenta',
  },
]

export interface PitchStep {
  no: string
  title: string
  detail: string
}

export const PITCH_STEPS: PitchStep[] = [
  {
    no: '01',
    title: 'Claim a plot',
    detail: 'Sign in and the city hands you an address — one of two hundred, somewhere in the grid.',
  },
  {
    no: '02',
    title: 'Build with voxels',
    detail: 'Stack neon, glass, concrete and signage block by block into a structure that’s unmistakably yours.',
  },
  {
    no: '03',
    title: 'Light up the skyline',
    detail: 'Your build goes live in the shared city for every other resident to fly past and remember.',
  },
]

export const HERO = {
  kicker: 'PERSISTENT · ONLINE · 200 PLOTS',
  title: 'FUTURECITY',
  tagline: 'A neon city you don’t just visit — you build it.',
  scrollHint: 'SCROLL TO DESCEND',
} as const
