# CLAUDE.md

Context for Claude Code working in this repo.

## What this is

Personal portfolio for **Zijing Wang**, targeting **Product Data Science** roles.
Deployed as a GitHub Pages user site at `zwang-real.github.io`.

This is **v3** — a full rebuild. v2 was a single static `index.html` (light theme,
Swiss-typography feel). v3 replaces it with an Astro site in a dark terminal /
data-archive aesthetic, with a generative Three.js hero.

## Design direction (locked — don't drift from this)

Keywords: *terminal minimal / data-as-aesthetic / restrained motion / archive feel*

| Decision | Value |
|---|---|
| Theme | **Dark only.** No light mode, no theme toggle. |
| Language | **English only.** |
| Stack | Astro + Three.js + vanilla CSS/JS. **No animation library.** |
| Deploy | GitHub Pages (user site, root path) |

### Color tokens (in `src/styles/tokens.css`)

```
--bg        #0A0A0A   near-black, not pure black
--text      #E8E8E6   warm white
--text-dim  #8A8A86   secondary
--text-aux  #55554F   annotations / captions
--hairline  rgba(38,38,34,0.53)
--accent    #E8946A   muted orange
```

**Accent discipline is the whole aesthetic.** `--accent` appears in exactly five
places sitewide: active nav dot, hover underline, status indicator dot, a
handful of highlighted lines in the hero terrain, and the interactive-cursor
reticle (the target crosshair shown over links/buttons — see custom cursor
below; this one is a deliberate, Zijing-approved exception justified as click
affordance). Everything else is greyscale. Site-wide accent usage should stay
under ~2%. If a change adds orange somewhere new beyond these five, that's almost
certainly wrong.

### Typography

- Body/UI: **IBM Plex Mono**
- A/B experiment in progress: Plan A = all-mono; Plan B = Plex Mono body +
  Space Grotesk headings. Toggle is wired via `<html class="font-b">` and a
  dev-only `FontToggle.astro` button (bottom-left). **Not yet decided.**

### Typographic language

Keep these — they carry the terminal feel:
- Numbered sections: `01.` / `02.`
- `$` prompt prefix
- `[ action ]` bracketed buttons
- Hairline rules
- Edge metadata at the four page corners (`ZIJING.PORTFOLIO / v3.0`, live local
  clock, `SCROLL 042%`) — cheap to build, biggest single source of archive feel
- Coordinate-style section meta: `02. PROJECTS  [ n=6 ]`

### Motion principle

Every animation should read as *"a system is running,"* not *"a webpage is showing
off."* All motion respects `prefers-reduced-motion`.

**Explicitly out of scope** (agreed, don't add these):
- Cursor trails, page-transition animations, parallax stacking, colored gradient blobs
- Any loading screen over 1 second
- Contact forms (static site — contact is email + LinkedIn only)

**In scope, and shipped** (don't mistake these for the rejected effects above):
- **Ambient scatter field** (`AmbientField.astro` + `scripts/ambient.ts`) — a
  faint, monochrome, sparse point field fixed behind all content so scrolling
  past the hero never lands on flat black. It is *data-as-aesthetic* (star chart
  / scatter), NOT the rejected hero "particles": no connecting lines, no glow, no
  accent colour, ~30–44% peak alpha, slow drift, `+` scatter marks. Static under
  `prefers-reduced-motion`, pauses when tab hidden. Tuning knobs are constants at
  the top of `ambient.ts`.
- **Cursor-proximity glow** — points within ~140px of the cursor brighten and
  grow, peaking at the cursor. This is the *restrained local lift* we always
  meant by "brighten near cursor," NOT a trail. The analogous hero-terrain
  version now ships too (see P2 → hero hover effect).
- **Custom terminal-reticle cursor** — see the accent-discipline note above.

## Architecture

```
src/
├── pages/index.astro       single home page, composes all sections
├── layouts/BaseLayout.astro  fonts, meta, EdgeMeta, FontToggle
├── components/
│   ├── Hero.astro          terrain canvas + boot sequence + data annotations
│   ├── About.astro
│   ├── Experience.astro    expand-on-click <details> list
│   ├── Projects.astro      three tiers (see below)
│   ├── Toolkit.astro       ⚠️ skills currently HARDCODED here, not in content/
│   ├── Writing.astro       self-hides when no non-draft posts exist
│   ├── Contact.astro
│   ├── Sidebar.astro       nav + scrollspy
│   ├── EdgeMeta.astro      four-corner archive metadata
│   ├── AmbientField.astro  fixed page-wide scatter-field canvas (see below)
│   ├── SectionHeader.astro shared `01. TITLE [ meta ] ────` header
│   └── FontToggle.astro    ⚠️ dev-only, delete once font plan is decided
├── scripts/
│   ├── terrain.ts          Three.js hero — see below
│   └── ambient.ts          2D-canvas ambient scatter + cursor-proximity glow
├── styles/
│   ├── tokens.css          ALL design tokens. Change here, not in components.
│   └── global.css          reset + utilities + .reveal/.section
├── data/site.json          name, tagline, about, socials, status — single source of truth
└── content/                Astro content collections (schema in config.ts)
    ├── projects/
    ├── experience/
    └── writing/
```

### Content model

Adding content = adding a markdown file. **Never** hardcode content into components.
Schemas live in `src/content/config.ts` and are type-checked at build.

**Projects have three tiers** (structure is fixed, content slots in):
- `flagship` — one big card, image + long body + live demo link. The best work.
- `regular` — title + one-liner + tags + link. Grid.
- `playground` — one-liner list. Supports `embedUrl` for iframe'd live demos
  (e.g. p5.js sketches running inline). This capability is built; using it is optional.

**Writing** auto-hides itself (section *and* sidebar nav item) while no non-draft
post exists. `draft-placeholder.md` exists only to keep the collection non-empty
so Astro doesn't warn — delete it once there are real posts.

### Hero terrain (`src/scripts/terrain.ts`)

This went through many iterations. Current and final approach:

- `THREE.LineSegments` — a **woven line mesh**, not particles, not a shaded surface
- Additive blending: the glow at dense peaks is *emergent* from line overlap,
  not a lighting pass
- Vertices are jittered and neighbor-edges are randomly skipped, so the weave
  looks organic rather than gridded
- `PEAKS[]` defines the silhouette: one dominant central peak with cascading,
  asymmetric flanks. Peaks overlap enough (via sigma) to read as one continuous
  range rather than isolated spires.
- `peakFalloff()` blends gaussian (round base) with exponential (sharp tip).
  Pure gaussian → domes. Pure exponential → spikes. Current mix is 60/40.

**Aesthetic constraint learned the hard way:** the visual language is *fine
intersecting lines*. Particles, filled 3D shading, and blobby volumetric effects
have all been tried and explicitly rejected. Don't reintroduce them.

**Tuning gotchas:**
- Narrowing sigmas too aggressively makes peaks isolated and shrinks them out of frame
- If the main peak grows, `mesh.position.y` and `maxH` must both be adjusted or
  the summit clips off the top of the viewport
- Verify the peak is visible in-frame after any silhouette change

## Status

### Done

- [x] Astro scaffold, builds clean (`npx astro build`)
- [x] All 7 sections built (Hero / About / Experience / Projects / Toolkit / Writing / Contact)
- [x] Design tokens + global styles
- [x] Content collections + schemas, with placeholder markdown in each
- [x] Hero terrain — woven-line mountain range, silhouette finalized
- [x] Terminal boot sequence (`$ whoami` → name → `$ cat mission.txt` → tagline),
      plays once per session via `sessionStorage`
- [x] Edge metadata (four corners, live clock, scroll %)
- [x] Sidebar scrollspy
- [x] Scroll-reveal on sections (IntersectionObserver + CSS)
- [x] Font A/B toggle wired
- [x] Writing section self-hiding logic
- [x] Pushed to `zwang-real.github.io`

### Blocked / needs a decision from Zijing

- [ ] **Repo is Private.** GitHub Pages does not build private repos on the free
      plan. Either make the repo public or upgrade to Pro. **This blocks deploy.**
- [ ] Font plan: A (all-mono) vs B (mono + Space Grotesk). Toggle is live —
      flip it, pick one.
- [ ] What name goes in `$ whoami` — "Zijing", full pinyin, or an English name?

### P0 — get the site live again

The site is currently **down**: Pages is still configured to serve the repo root,
but the root is now Astro source, not a built `index.html`.

- [ ] Set `site: 'https://zwang-real.github.io'` in `astro.config.mjs`
      (no `base` needed — user sites deploy at root)
- [ ] Add `.github/workflows/deploy.yml` — build with Node 20, `npm ci`,
      `npm run build`, then `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`
      on `./dist`. Needs `permissions: { contents: read, pages: write, id-token: write }`.
- [ ] Commit `package-lock.json` (the workflow's `npm ci` requires it)
- [ ] Repo Settings → Pages → Source: switch from "Deploy from a branch" to
      **"GitHub Actions"**
- [ ] Resume PDF: `Zijing_Wang.pdf` needs to live in `public/`. Either rename it
      to `resume.pdf` or update `resumeUrl` in `src/data/site.json` to match.

### P1 — real content (all placeholders right now)

Every `[SOMETHING_PLACEHOLDER]` string is meant to be globally find-and-replaced.

- [ ] `src/data/site.json` — real name, tagline, about paragraph, email, GitHub, LinkedIn
- [ ] `src/content/experience/*.md` — three real roles
- [ ] `src/content/projects/*.md` — real projects, sorted into the three tiers
- [ ] `src/components/Toolkit.astro` — skills are hardcoded in the component;
      replace with the real stack (or migrate to a content collection / `site.json`)

### P2 — polish

- [x] Hero hover effect — brighten terrain lines near the cursor. Raycasts the
      cursor onto the y=0 plane and lifts per-vertex alpha within `GLOW_R`, eased
      in/out. NDC is computed from the canvas rect (not the window) because the
      canvas sits right of the sidebar. Knobs: `GLOW_R` / `GLOW_BOOST` in terrain.ts.
- [ ] Once font plan is chosen: delete `FontToggle.astro`, remove it from
      `BaseLayout.astro`, and strip the unused font from the Google Fonts URL
      and the `html.font-b` block in `tokens.css`
- [ ] Number roll-up animation on key metrics when they scroll into view
- [x] Ambient scatter field behind content + cursor-proximity glow (see Motion
      principle → "In scope, and shipped")
- [x] Custom crosshair cursor — terminal reticle, warm-white default + accent
      target over interactive elements
- [ ] Lighthouse: performance target is **≥ 90**. Hero text must be visible within
      1s; the terrain loads async and must not block first paint.
- [ ] Repo About: add a description and the site URL

## Working conventions

- **`npx astro build` is the validation tool of choice.** It's faster and more
  informative than `astro check`. Run it after any structural change.
- Design tokens go in `tokens.css`. If a component hardcodes a hex value or a
  font stack, that's a bug.
- Astro gotcha: prefix any file in a content collection directory that isn't a
  content entry with `_` so Astro ignores it (e.g. `_README.md`). Otherwise the
  build fails on schema validation.
- Don't add `vite.build.cssMinify: 'lightningcss'` to the Astro config — it
  requires an optional dep that isn't installed and breaks the build.
- Keep the hero terrain code as one self-contained init function so it can be
  swapped or tuned without touching anything else.
