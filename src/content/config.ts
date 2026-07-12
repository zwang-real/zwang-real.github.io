import { defineCollection, z } from 'astro:content';

/* ── Projects ─────────────────────────────────────────
   Three tiers per spec doc:
   - flagship   → 1 hero card, image + long description + live link
   - regular    → title + one-liner + tag + link
   - playground → single line, optional iframe embed
   Add a project by dropping a .md file in src/content/projects/.
─────────────────────────────────────────────────────── */
const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    tier: z.enum(['flagship', 'regular', 'playground']),
    tags: z.array(z.string()).default([]),
    order: z.number().default(0),           // sort within tier (lower first)
    image: z.string().optional(),           // URL under /public
    demoUrl: z.string().url().optional(),
    repoUrl: z.string().url().optional(),
    embedUrl: z.string().url().optional(),  // playground iframe
    hidden: z.boolean().default(false),
    year: z.number().optional(),
  }),
});

/* ── Experience ─────────────────────────────────────── */
const experience = defineCollection({
  type: 'content',
  schema: z.object({
    company: z.string(),
    role: z.string(),
    location: z.string().optional(),
    dateStart: z.string(),                  // e.g. "2024-06"
    dateEnd: z.string().default('PRES'),    // "PRES" or "2024-12"
    tags: z.array(z.string()).default([]),
    order: z.number().default(0),           // manual sort (lower = newer, on top)
    hidden: z.boolean().default(false),
  }),
});

/* ── Writing (hidden until content exists) ──────────── */
const writing = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    tags: z.array(z.string()).default([]),
    excerpt: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, experience, writing };
