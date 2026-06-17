/**
 * Shared presentational building blocks for the Learn views.
 *
 * A small, airy, Google-flavoured kit — page/section headers, cards, toned
 * chips, ratings, filters and search — so every section reads consistently and
 * individual views stay declarative. Colour tones map through `tokens.css`, and
 * `categoryTone` keeps category-chip colours consistent across sections without
 * baking presentation into the content data.
 */

import type { ReactNode, SVGProps } from "react";
import { clsx } from "clsx";

import type { AccentTone } from "./content/types";
import styles from "./primitives.module.css";

/* ── Tones ─────────────────────────────────────────────────────────────── */

const TONE_CLASS: Record<AccentTone, string> = {
  blue: styles.toneBlue ?? "",
  red: styles.toneRed ?? "",
  yellow: styles.toneYellow ?? "",
  green: styles.toneGreen ?? "",
  purple: styles.tonePurple ?? "",
  teal: styles.toneTeal ?? "",
};

export function toneClass(tone: AccentTone): string {
  return TONE_CLASS[tone] ?? "";
}

const CATEGORY_TONE: Record<string, AccentTone> = {
  Foundation: "purple",
  Robotics: "green",
  NLP: "yellow",
  History: "red",
  "Expert Systems": "teal",
  Milestone: "blue",
  "Deep Learning": "green",
  "Computer Vision": "yellow",
  Architecture: "red",
  LLM: "purple",
  "Large Language Models": "green",
  Application: "blue",
  "Open Source": "green",
  Multimodal: "yellow",
  Frontier: "purple",
  "Core Concept": "blue",
  "Model Type": "purple",
  Training: "green",
  Optimization: "teal",
  Decoding: "yellow",
  Alignment: "red",
  Transformers: "purple",
  "Reinforcement Learning": "red",
  Reasoning: "blue",
  Technique: "teal",
  Model: "purple",
  New: "green",
};

/** Map a free-text category to a stable tone (fallback: blue). */
export function categoryTone(category: string): AccentTone {
  return CATEGORY_TONE[category] ?? "blue";
}

/* ── Headers ───────────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeadingText}>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
      </div>
      {action && <div className={styles.sectionAction}>{action}</div>}
    </div>
  );
}

export function ViewAllLink({ label = "View all", onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button type="button" className={styles.viewAll} onClick={onClick}>
      {label} <span aria-hidden="true">→</span>
    </button>
  );
}

/* ── Cards ─────────────────────────────────────────────────────────────── */

export function Card({
  interactive,
  active,
  onClick,
  className,
  ariaLabel,
  children,
}: {
  interactive?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const clickable = interactive || Boolean(onClick);
  return (
    <div
      className={clsx(styles.card, clickable && styles.cardInteractive, active && styles.cardActive, className)}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={ariaLabel}
      aria-pressed={clickable && active ? true : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

/* ── Chips, tags, badges ───────────────────────────────────────────────── */

export function CategoryChip({ category, tone }: { category: string; tone?: AccentTone }) {
  return <span className={clsx(styles.chip, toneClass(tone ?? categoryTone(category)))}>{category}</span>;
}

export function Tag({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  if (onClick) {
    return (
      <button type="button" className={clsx(styles.tag, styles.tagButton)} onClick={onClick}>
        {children}
      </button>
    );
  }
  return <span className={styles.tag}>{children}</span>;
}

export function IconBadge({
  tone,
  size = "md",
  className,
  children,
}: {
  tone: AccentTone;
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        styles.iconBadge,
        size === "sm" && styles.iconBadgeSm,
        size === "lg" && styles.iconBadgeLg,
        toneClass(tone),
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Ratings ───────────────────────────────────────────────────────────── */

export function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className={styles.stars} aria-label={`Impact ${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={clsx(styles.star, i < value && styles.starOn)} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}

export function LevelDots({ value, max = 5, tone = "blue" }: { value: number; max?: number; tone?: AccentTone }) {
  return (
    <span className={clsx(styles.dots, toneClass(tone))} aria-label={`Difficulty ${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={clsx(styles.dot, i < value && styles.dotOn)} aria-hidden="true" />
      ))}
    </span>
  );
}

/* ── Misc text ─────────────────────────────────────────────────────────── */

export function Meta({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx(styles.meta, className)}>{children}</p>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyMsg}>{message}</p>
    </div>
  );
}

/* ── Inputs & filters ──────────────────────────────────────────────────── */

function SearchGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true" {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className={styles.search}>
      <SearchGlyph className={styles.searchIcon} />
      <input
        type="search"
        className={styles.searchField}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<string>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.filterChips} role="tablist" aria-label="Filter">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="tab"
          aria-selected={value === opt}
          onClick={() => onChange(opt)}
          className={clsx(styles.filterChip, value === opt && styles.filterChipActive)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export type SegmentOption<T extends string> = Readonly<{ value: T; label: ReactNode }>;

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className={styles.segmented} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(styles.segment, value === o.value && styles.segmentActive)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
