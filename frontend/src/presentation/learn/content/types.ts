/**
 * Content types for the Learn surface.
 *
 * Every Learn section renders from statically-authored, frozen data that ships
 * with the app — there is no backend call anywhere in this feature. These are
 * the shapes that data conforms to; the data itself lives in the sibling files
 * (`timeline.ts`, `concepts.ts`, …). All types are `Readonly` to signal that
 * the content is immutable at runtime.
 */

/** Decorative accent tone — drives chip / tile / dot colours via tokens.css. */
export type AccentTone = "blue" | "red" | "yellow" | "green" | "purple" | "teal";

export type ContentLevel = "Beginner" | "Intermediate" | "Advanced";

export type ExternalLink = Readonly<{
  label: string;
  href: string;
}>;

/* ── Timeline ──────────────────────────────────────────────────────────── */

export type Decade =
  | "1950s"
  | "1960s"
  | "1970s"
  | "1980s"
  | "1990s"
  | "2000s"
  | "2010s"
  | "2020s";

export type TimelineEvent = Readonly<{
  id: string;
  /** Display year — may be a span ("1970s") or open-ended ("2025+"). */
  year: string;
  /** Numeric key for ordering (start year of the span). */
  sortYear: number;
  decade: Decade;
  title: string;
  /** One-line summary shown in the master list / table. */
  tagline: string;
  category: string;
  /** Relative impact, 1–5. */
  impact: number;
  /** Detail-panel paragraph. */
  summary: string;
  /** "Impact" bullet points in the detail panel. */
  details: ReadonlyArray<string>;
  /** Free-text related-concept tags. */
  relatedConcepts: ReadonlyArray<string>;
  /** Optional named figure (person / lab) for the detail panel. */
  figure?: string;
  links?: ReadonlyArray<ExternalLink>;
}>;

export type DecadeEra = Readonly<{
  decade: Decade;
  title: string;
  subtitle: string;
  tone: AccentTone;
}>;

/* ── Concepts ──────────────────────────────────────────────────────────── */

export type ConceptResourceKind =
  | "Research Paper"
  | "Blog Article"
  | "YouTube Video"
  | "Documentation";

export type ConceptResource = Readonly<{
  title: string;
  kind: ConceptResourceKind;
  href: string;
}>;

export type ConceptFormula = Readonly<{
  label: string;
  formula: string;
  note?: string;
}>;

export type Concept = Readonly<{
  id: string;
  name: string;
  category: string;
  level: ContentLevel;
  readMinutes: number;
  /** Difficulty dots, 1–5. */
  difficulty: number;
  /** Card blurb. */
  summary: string;
  /** Detail "What is …?" paragraph. */
  overview: string;
  keyTakeaways: ReadonlyArray<string>;
  howItWorks: ReadonlyArray<string>;
  math: ReadonlyArray<ConceptFormula>;
  related: ReadonlyArray<string>;
  resources: ReadonlyArray<ConceptResource>;
}>;

/* ── Research papers ───────────────────────────────────────────────────── */

export type PaperTag = "Foundation" | "New" | "Technique" | "Model";

export type Paper = Readonly<{
  id: string;
  title: string;
  authors: string;
  year: number;
  category: string;
  tag: PaperTag;
  summary: string;
  citations?: number;
  readMinutes?: number;
  href?: string;
}>;

export type PaperCategoryCard = Readonly<{
  category: string;
  count: number;
  tone: AccentTone;
}>;

/* ── Blogs & articles ──────────────────────────────────────────────────── */

export type Blog = Readonly<{
  id: string;
  title: string;
  author: string;
  org?: string;
  date: string;
  readMinutes: number;
  summary: string;
  tags: ReadonlyArray<string>;
  accent: AccentTone;
  href?: string;
}>;

/* ── Architecture evolution ────────────────────────────────────────────── */

export type ArchitectureEra = Readonly<{
  id: string;
  name: string;
  era: string;
  tagline: string;
  description: string;
  keyIdeas: ReadonlyArray<string>;
  examples: string;
  /** What it improved on / replaced. */
  supersedes: string;
  tone: AccentTone;
}>;

/* ── Benchmarks ────────────────────────────────────────────────────────── */

export type Benchmark = Readonly<{
  id: string;
  name: string;
  fullName: string;
  domain: string;
  description: string;
  metric: string;
  topModel: string;
  topScore: string;
  tone: AccentTone;
}>;

/* ── Glossary ──────────────────────────────────────────────────────────── */

export type GlossaryTerm = Readonly<{
  term: string;
  abbr?: string;
  definition: string;
  related: ReadonlyArray<string>;
}>;

/* ── Fun facts (Overview) ──────────────────────────────────────────────── */

export type FunFact = Readonly<{
  id: string;
  text: string;
  accent: AccentTone;
}>;
