# Portfolio v3

Dark terminal / data-archive aesthetic. Astro + Three.js.

## Stack

- **Astro 4** — static site generator, content collections
- **Three.js** — hero terrain (woven-line mountain range)
- **CSS custom properties** — design tokens in `src/styles/tokens.css`
- **No animation library** — IntersectionObserver + CSS transitions only

## Run it

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # → dist/
npm run preview   # serve the build locally
```

Node 18+ required (Astro 4 baseline).

## Structure

```
src/
├── pages/            index.astro is the single home page
├── layouts/          BaseLayout wraps every page (fonts, meta)
├── components/       one .astro per section + Hero terrain + Sidebar/EdgeMeta
├── scripts/          terrain.ts is the woven-line mountain range
├── styles/           tokens.css (design tokens) + global.css
├── data/             site.json — name, tagline, socials, status
└── content/          content collections (see below)
    ├── projects/     one .md per project
    ├── experience/   one .md per role
    └── writing/      one .md per post (section hides itself while empty)
```

## Adding content

Every collection is markdown with frontmatter. Schemas are defined in
`src/content/config.ts` — Astro will type-check them at build.

### A project

Create `src/content/projects/my-thing.md`:

```md
---
title: 'My Thing'
tagline: 'One-line description'
tier: 'regular'          # 'flagship' | 'regular' | 'playground'
tags: ['python', 'ml']
order: 10                # sort within tier, lower first
demoUrl: 'https://...'   # optional
repoUrl: 'https://...'   # optional
image: '/projects/my-thing.png'   # optional, put file in public/projects/
year: 2025
---

Longer description here. Markdown allowed. Used for the flagship card body.
```

Tiers per the spec:

- `flagship` — big hero card (image + long description + live link). One is ideal.
- `regular` — title + one-liner + tag + link. Grid.
- `playground` — one-liner. Supports `embedUrl` for iframe live demos.

### An experience entry

Create `src/content/experience/my-role.md`:

```md
---
company: 'Company Name'
role: 'Data Science Intern'
dateStart: '2024-06'
dateEnd: 'PRES'          # or e.g. '2024-12'
tags: ['analytics', 'a/b']
order: 1                 # lower = newer, on top
---

Bullet points or a paragraph. Shown in the expand-on-click details.
```

### A blog post

Create `src/content/writing/my-post.md`:

```md
---
title: 'My Post'
date: 2025-03-14
tags: ['essay']
excerpt: 'Optional one-liner shown in previews.'
draft: false             # true = hidden from the site
---

Post body. Markdown.
```

Once at least one non-draft post exists, the Writing section and its
sidebar nav item appear automatically. The scaffold `draft-placeholder.md`
in `src/content/writing/` keeps Astro's content-collection happy while
the folder is otherwise empty — you can delete it once you have real posts.

## Site metadata

`src/data/site.json` — name, role, tagline, about, socials, status, version.
This is the single source of truth for anything that shows up in more than
one place (sidebar logo, hero boot lines, contact section, meta tags).

## Design tokens

`src/styles/tokens.css` — every color, font, spacing, and timing value.
Change them here and the whole site follows.

Typography is **Plan A: IBM Plex Mono throughout**. The earlier A/B toggle
(`FontToggle.astro`, the `html.font-b` block, and the Space Grotesk web font)
has been removed. `--font-heading` / `--font-display` remain as tokens but now
alias the mono stack.

## Hero terrain

`src/scripts/terrain.ts` is a self-contained Three.js init. The
`PEAKS` array + `peakFalloff` function define the mountain silhouette.
Rendered as `THREE.LineSegments` with additive blending — the woven
"glow" is emergent from dense line overlap, not a lighting pass.

## Deploy

Any static host works. Vercel is easiest — connect the repo, framework
preset "Astro", no configuration needed.
