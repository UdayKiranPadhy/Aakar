# Authoring Learn content

This folder is the **single source of content** for the **Learn** surface — the
AI Timeline, Concepts, Architecture Evolution, Research Papers, Blogs,
Benchmarks, Glossary and the Overview dashboard that previews them all.

> **No backend, no database, no fetch.** Every Learn section renders from the
> frozen arrays in this folder. Adding content = editing one TypeScript file and
> reloading. This guide is the playbook for doing that later, from cold.

| File | Exports | Powers |
| --- | --- | --- |
| [`papers.ts`](papers.ts) | `PAPERS`, plus filter/category/trending constants | Research Papers |
| [`blogs.ts`](blogs.ts) | `BLOGS` | Blogs & Articles |
| [`timeline.ts`](timeline.ts) | `TIMELINE_EVENTS`, `DECADE_ERAS` | AI Timeline |
| [`architectures.ts`](architectures.ts) | `ARCHITECTURE_ERAS` | Architecture Evolution |
| [`concepts.ts`](concepts.ts) | `CONCEPTS` | Concepts (+ shareable detail pages) |
| [`benchmarks.ts`](benchmarks.ts) | `BENCHMARKS` | Benchmarks |
| [`glossary.ts`](glossary.ts) | `GLOSSARY` | Glossary |
| [`facts.ts`](facts.ts) | `FUN_FACTS` | Overview "Fun Facts" |
| [`types.ts`](types.ts) | every `Readonly<…>` shape below | the type contract |

---

## Golden rules (read once)

1. **Append, don't restructure.** In almost every case you add one object to the
   end of an array. The views derive everything else (filters, categories,
   years, sort, search) from the data — see each section below.
2. **`id` must be unique within its file** and **kebab-case** (`deepseek-v3`,
   not `DeepSeek V3`). For concepts the `id` becomes the shareable URL
   (`/learn?...&concept=<id>`), so treat it as a permalink — don't rename it
   later or you break shared links.
3. **Everything is `Readonly`/frozen.** Author plain object literals; never
   mutate at runtime.
4. **New categories and tones "just work".** Category strings are free text;
   `categoryTone()` falls back to `blue` for anything it doesn't recognise
   (see [Tones](#tones)). Nothing crashes if you invent a new category.
5. **Author order is meaningful on the Overview.** The Overview dashboard
   previews the **first N** items of several arrays (concepts → 8, architecture
   eras → 6, foundation papers → 5, blogs → 4). Put a new item at the **top** to
   feature it there; append to the **end** to leave the preview unchanged.
6. **Facts over filler.** Titles, authors, years and dates are accurate to the
   record; only "soft" numbers (citation counts, category totals) are
   illustrative — they're labelled as such in the files.
7. **Verify before you commit:** `pnpm build` (this is what actually
   type-checks — see the repo's note that `pnpm typecheck` is a no-op), then
   `pnpm dev` and click through the section.

---

## 1 · Add a research paper → [`papers.ts`](papers.ts)

Append a `Paper` to the `PAPERS` array.

```ts
{
  id: "deepseek-v3",                       // unique, kebab-case
  title: "DeepSeek-V3 Technical Report",
  authors: "DeepSeek-AI",                  // "F. Last et al." | "OpenAI" | "Meta AI"
  year: 2024,
  category: "Large Language Models",       // free text; groups the category dropdown
  tag: "New",                              // "Foundation" | "New" | "Technique" | "Model"
  summary: "A 671B-parameter MoE model trained efficiently at scale.",
  citations: 1200,                         // optional — drives the "Most Cited" rail (illustrative)
  readMinutes: 30,                         // optional — shown when no citation count
  href: "https://arxiv.org/abs/2412.19437" // optional — the PDF / arXiv link
},
```

**Auto-derived (you do nothing):** the **Category** and **Year** filter
dropdowns, full-text **search** (title/authors/category), and the section rows —
`tag: "Foundation"` lands it in **Foundation Papers**, `tag: "New"` in **Recent
Breakthroughs**, and a high `citations` count floats it up the **Most Cited**
rail.

**Optional polish** (only if you introduce a *brand-new* `category`):
- Add the category string to `PAPER_FILTERS` to give it a top-of-page **chip**.
- Add a `PAPER_CATEGORY_CARDS` entry (`{ category, count, tone }`) to give it a
  **"Browse by Category"** tile.
- `PAPER_TOTAL` and `PAPER_TRENDING_TOPICS` are decorative headers — bump them if
  you like, but nothing depends on them.

> The right-rail **"Most Influential"** card is pinned to the paper with
> `id: "attention"` (falls back to the first paper). Change that id in
> `ResearchPapersLearnView.tsx` only if you want to feature a different one.

---

## 2 · Add a blog / article → [`blogs.ts`](blogs.ts)

Append a `Blog` to the `BLOGS` array. **Purely additive** — nothing else to touch.

```ts
{
  id: "kv-cache-explained",
  title: "The KV Cache, Explained",
  author: "Jane Doe",
  org: "Some Lab",                 // optional — shown instead of author when present
  date: "Jun 12, 2024",            // human-readable; display-only
  readMinutes: 9,
  summary: "Why the KV cache dominates inference memory, and how to budget it.",
  tags: ["Inference", "KV Cache", "Performance"],
  accent: "blue",                  // tone for the card icon — see Tones
},
```

**Search** covers title, summary, author and tags. The Overview previews the
**first 4** blogs in author order.

---

## 3 · Add a timeline milestone → [`timeline.ts`](timeline.ts)

Append a `TimelineEvent` to `TIMELINE_EVENTS`. Order in the array doesn't matter —
the view **sorts by `sortYear`**.

```ts
{
  id: "gpt5-2025",
  year: "2025",                    // display string — may be a span ("2021–22") or open ("2025+")
  sortYear: 2025,                  // numeric key used for ordering
  decade: "2020s",                 // MUST be one of the Decade union members (see note)
  title: "GPT-5 Released",
  tagline: "One-line summary for the master list and table.",
  category: "LLM",                 // free text; colours the rail dot via categoryTone
  impact: 5,                       // 1–5 → star rating
  figure: "OpenAI",                // optional — person/lab; renders an initials avatar
  summary: "A longer paragraph for the detail panel.",
  details: [                       // the "Why it mattered" bullet list
    "First impact bullet.",
    "Second impact bullet.",
  ],
  relatedConcepts: ["Scaling Laws", "Reasoning"],   // free-text tags
  links: [{ label: "Read the paper", href: "https://arxiv.org/abs/…" }], // optional
},
```

> **Decades are a fixed set.** `decade` must be one of
> `"1950s" … "2020s"` (the `Decade` union in `types.ts`). Those values are
> covered by `DECADE_ERAS`, which drives the decade rail and the decade filter.
> You only touch `DECADE_ERAS` / the `Decade` type if a future milestone needs a
> brand-new decade (e.g. `"2030s"`) — add it to **both** in the same edit.

---

## 4 · Add an architecture era → [`architectures.ts`](architectures.ts)

Append an `ArchitectureEra` to `ARCHITECTURE_ERAS`. **Purely additive.** This is
a curated *arc*, so keep the array in rough chronological order — it renders
left-to-right as a flow, and the Overview previews the **first 6**.

```ts
{
  id: "state-space",
  name: "State-Space Models",
  era: "2023 – present",
  tagline: "Linear-time sequence modelling without attention.",
  description: "A 2–3 sentence explainer of the generation and what it changed.",
  keyIdeas: ["Selective state spaces", "Linear-time scan", "Long context"],
  examples: "Mamba, Mamba-2, Jamba",
  supersedes: "Quadratic-attention Transformers for long sequences",
  tone: "teal",                    // see Tones
},
```

---

## 5 · Add a concept → [`concepts.ts`](concepts.ts)

Append a `Concept` to `CONCEPTS`. The **category filter auto-derives** from the
data, so a new `category` becomes a new dropdown option for free.

```ts
{
  id: "moe",                       // becomes the shareable URL ?concept=moe — treat as a permalink
  name: "Mixture of Experts",
  category: "Architecture",        // free text; auto-added to the category dropdown
  level: "Intermediate",           // "Beginner" | "Intermediate" | "Advanced"
  readMinutes: 7,
  difficulty: 3,                   // 1–5 → difficulty dots
  summary: "Card blurb — one sentence.",
  overview: "The 'What is …?' opening paragraph on the detail page.",
  keyTakeaways: ["Point one.", "Point two.", "Point three."],
  howItWorks: ["Step one.", "Step two."],
  math: [
    {
      label: "Top-k gating",
      formula: "y = Σ  G(x)ᵢ · Eᵢ(x)",   // plain text — use Unicode (√ Σ · ᵢ …), not LaTeX
      note: "Optional caption under the formula.",
    },
  ],
  related: ["Transformers", "Sparse Attention"],  // see note below
  resources: [
    { title: "Outrageously Large Neural Networks", kind: "Research Paper", href: "https://arxiv.org/abs/1701.06538" },
    // kind ∈ "Research Paper" | "Blog Article" | "YouTube Video" | "Documentation"
  ],
},
```

> **`related` links by name.** Each string in `related` is matched
> **case-insensitively against another concept's `name`** to make it clickable
> on the detail page. Spell it exactly like the target concept's `name` (e.g.
> `"Transformers"`), or it renders as a plain, non-navigating tag — which is
> fine for ideas that don't have their own concept yet.

---

## Other content (same pattern)

The user-requested five above are the common ones. Three more arrays follow the
identical "append one object" rule — see their shapes in [`types.ts`](types.ts):

- **Benchmarks** → [`benchmarks.ts`](benchmarks.ts) (`Benchmark`).
- **Glossary** → [`glossary.ts`](glossary.ts) (`GlossaryTerm`); `related` cross-links by term.
- **Fun Facts** → [`facts.ts`](facts.ts) (`FunFact`); short trivia on the Overview.

---

## Tones

`AccentTone` = `"blue" | "red" | "yellow" | "green" | "purple" | "teal"`. These
map to colours in [`../../../styles/tokens.css`](../../../styles/tokens.css) via
`toneClass()` / `categoryTone()` in [`../primitives.tsx`](../primitives.tsx).

- Fields named `tone` / `accent` take an `AccentTone` directly — pick any.
- Fields named `category` are free text; `categoryTone()` maps known categories
  to a stable colour and **falls back to `blue`** for anything new. To give a new
  category its own colour, add one line to the `CATEGORY_TONE` map in
  `primitives.tsx` — optional, never required.

---

## Adding a whole new Learn *section* (rare)

Adding a *section* (a new left-nav tab), not just an item, is also small:

1. Write the view component in [`../../learn-views/`](../../learn-views/).
2. `learnViewRegistry.register({ key, label, order }, YourView)` in
   [`../../learn-views/register.tsx`](../../learn-views/register.tsx) — `order`
   sets its position in the sidebar.
3. Add the new `key` to the `LearnView` union in
   [`../../../domain/navigation.ts`](../../../domain/navigation.ts).

That's a component file + one registration line + one union member — the same
Strategy/Registry pattern the rest of the app uses.

---

## Checklist before you commit

- [ ] New `id` is unique in its file and kebab-case.
- [ ] Object satisfies its type (your editor / `pnpm build` will flag a miss).
- [ ] `pnpm build` passes (this is the real type-check; `pnpm typecheck` is a no-op).
- [ ] Clicked through the section in `pnpm dev` — card, detail, search, filters.
- [ ] If you wanted it featured on the Overview, it's near the **top** of its array.
