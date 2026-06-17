/**
 * Overview — the Learn landing dashboard. A hero, a condensed timeline strip,
 * and a set of preview sections (Concepts, Architecture Evolution, Learning
 * Paths, Papers, Blogs, Visualizations, Companies, Fun Facts) that each link
 * into their full section via the store's `setLearnView`. All content static.
 */

import { useState } from "react";
import { clsx } from "clsx";

import type { LearnView } from "../../domain/navigation";
import { useArchStore } from "../../store/archStore";
import { ARCHITECTURE_ERAS } from "../learn/content/architectures";
import { BLOGS } from "../learn/content/blogs";
import { COMPANIES } from "../learn/content/companies";
import { CONCEPTS } from "../learn/content/concepts";
import { FUN_FACTS } from "../learn/content/facts";
import { PAPERS } from "../learn/content/papers";
import { LEARNING_PATHS } from "../learn/content/paths";
import { DECADE_ERAS } from "../learn/content/timeline";
import { VIZ_TOOLS } from "../learn/content/visualizations";
import { TopicGlyph } from "../learn/LearnGlyphs";
import { CategoryChip, IconBadge, SectionHeader, ViewAllLink, categoryTone, toneClass } from "../learn/primitives";
import styles from "./OverviewLearnView.module.css";

export function OverviewLearnView() {
  const setLearnView = useArchStore((s) => s.setLearnView);
  const go = (v: LearnView) => setLearnView(v);
  const [heroQuery, setHeroQuery] = useState("");

  const popularConcepts = CONCEPTS.slice(0, 8);
  const archFlow = ARCHITECTURE_ERAS.slice(0, 6);
  const foundationPapers = PAPERS.filter((p) => p.tag === "Foundation").slice(0, 5);
  const blogs = BLOGS.slice(0, 4);
  const vizTools = VIZ_TOOLS.slice(0, 4);
  const companies = COMPANIES.slice(0, 5);

  return (
    <div className={styles.view}>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>Learn AI. Understand the Future.</h1>
          <p className={styles.heroSub}>
            Your all-in-one resource to explore the evolution of Artificial Intelligence, core concepts, research,
            architectures and more.
          </p>
          <form
            className={styles.heroSearch}
            onSubmit={(e) => {
              e.preventDefault();
              go("concepts");
            }}
          >
            <SearchSmall />
            <input
              className={styles.heroInput}
              value={heroQuery}
              onChange={(e) => setHeroQuery(e.target.value)}
              placeholder="Search any topic, concept, paper…"
              aria-label="Search Learn"
            />
            <button type="submit" className={styles.heroBtn}>
              Explore
            </button>
          </form>
        </div>
        <HeroArt />
      </section>

      {/* ── Timeline strip ───────────────────────────────────────────── */}
      <section className={styles.card}>
        <SectionHeader
          title="AI Timeline"
          subtitle="Explore key milestones in the history of Artificial Intelligence"
          action={<ViewAllLink label="View full timeline" onClick={() => go("timeline")} />}
        />
        <div className={styles.timelineStrip}>
          {DECADE_ERAS.map((era) => (
            <button key={era.decade} type="button" className={styles.strip} onClick={() => go("timeline")}>
              <span className={clsx(styles.stripDot, toneClass(era.tone))}>
                {era.decade.replace("19", "").replace("20", "")}
              </span>
              <span className={styles.stripDecade}>{era.decade}</span>
              <span className={styles.stripTitle}>{era.title}</span>
              <span className={styles.stripSub}>{era.subtitle}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Three-up: Concepts / Architecture / Paths ────────────────── */}
      <div className={styles.triple}>
        <section className={styles.card}>
          <SectionHeader
            title="Popular Concepts"
            subtitle="Explore essential AI concepts"
            action={<ViewAllLink onClick={() => go("concepts")} />}
          />
          <div className={styles.conceptGrid}>
            {popularConcepts.map((c) => (
              <button key={c.id} type="button" className={styles.conceptTile} onClick={() => go("concepts")}>
                <IconBadge tone={categoryTone(c.category)} size="sm">
                  <TopicGlyph topic={`${c.category} ${c.name}`} />
                </IconBadge>
                <span className={styles.conceptTileName}>{c.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <SectionHeader
            title="Architecture Evolution"
            subtitle="See how AI architectures evolved"
            action={<ViewAllLink onClick={() => go("architectures")} />}
          />
          <div className={styles.archFlow}>
            {archFlow.map((a, i) => (
              <div key={a.id} className={styles.archItem}>
                <button type="button" className={styles.archTile} onClick={() => go("architectures")}>
                  <IconBadge tone={a.tone} size="sm">
                    <TopicGlyph topic={`${a.name} ${a.tagline}`} />
                  </IconBadge>
                  <span className={styles.archName}>{a.name}</span>
                </button>
                {i < archFlow.length - 1 && (
                  <span aria-hidden="true" className={styles.archArrow}>→</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <SectionHeader
            title="Learning Paths"
            subtitle="Step-by-step guides to master AI"
            action={<ViewAllLink onClick={() => go("paths")} />}
          />
          <div className={styles.pathList}>
            {LEARNING_PATHS.map((p) => (
              <button key={p.id} type="button" className={styles.pathRow} onClick={() => go("paths")}>
                <IconBadge tone={p.tone} size="sm">
                  <TopicGlyph topic={p.title} />
                </IconBadge>
                <span className={styles.pathText}>
                  <span className={styles.pathTitle}>{p.title}</span>
                  <span className={styles.pathBlurb}>{p.blurb}</span>
                  <span className={styles.progressTrack}>
                    <span className={clsx(styles.progressFill, toneClass(p.tone))} style={{ width: `${p.progress}%` }} />
                  </span>
                </span>
                <span className={styles.pathPct}>
                  {p.lessons} lessons
                  <br />
                  {p.progress}%
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ── Research papers ──────────────────────────────────────────── */}
      <section className={styles.card}>
        <SectionHeader
          title="Important Research Papers"
          subtitle="Explore landmark papers that shaped modern AI"
          action={<ViewAllLink label="View all papers" onClick={() => go("papers")} />}
        />
        <div className={styles.paperRow}>
          {foundationPapers.map((p) => (
            <button key={p.id} type="button" className={styles.paperMini} onClick={() => go("papers")}>
              <CategoryChip category={p.tag} />
              <span className={styles.paperMiniTitle}>{p.title}</span>
              <span className={styles.paperMiniYear}>{p.year}</span>
              <span className={styles.paperMiniSummary}>{p.summary}</span>
              <span className={styles.paperMiniFoot}>{p.readMinutes} min read</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Blogs ────────────────────────────────────────────────────── */}
      <section className={styles.card}>
        <SectionHeader
          title="Blogs & Articles"
          subtitle="Curated reads from top AI researchers and engineers"
          action={<ViewAllLink label="View all blogs" onClick={() => go("blogs")} />}
        />
        <div className={styles.blogRow}>
          {blogs.map((b) => (
            <button key={b.id} type="button" className={styles.blogMini} onClick={() => go("blogs")}>
              <span className={clsx(styles.blogThumb, toneClass(b.accent))}>
                <TopicGlyph topic={b.tags.join(" ")} />
              </span>
              <span className={styles.blogText}>
                <span className={styles.blogTitle}>{b.title}</span>
                <span className={styles.blogMeta}>
                  {b.org ?? b.author} · {b.readMinutes} min read
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Three-up: Visualizations / Companies / Fun Facts ─────────── */}
      <div className={styles.triple}>
        <section className={styles.card}>
          <SectionHeader
            title="Interactive Visualizations"
            subtitle="Learn by playing and experimenting"
            action={<ViewAllLink label="View all tools" onClick={() => go("visualizations")} />}
          />
          <div className={styles.list}>
            {vizTools.map((v) => (
              <button key={v.id} type="button" className={styles.listRow} onClick={() => go("visualizations")}>
                <IconBadge tone={v.tone} size="sm">
                  <TopicGlyph topic={v.concept} />
                </IconBadge>
                <span className={styles.listText}>
                  <span className={styles.listTitle}>{v.name}</span>
                  <span className={styles.listSub}>{v.blurb}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <SectionHeader
            title="AI Companies"
            subtitle="Explore leading AI organizations"
            action={<ViewAllLink label="View all companies" onClick={() => go("companies")} />}
          />
          <div className={styles.list}>
            {companies.map((c) => (
              <button key={c.id} type="button" className={styles.listRow} onClick={() => go("companies")}>
                <span className={clsx(styles.companyAvatar, toneClass(c.tone))}>{c.name.charAt(0)}</span>
                <span className={styles.listText}>
                  <span className={styles.listTitle}>{c.name}</span>
                  <span className={styles.listSub}>Key models: {c.keyModels}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <SectionHeader title="Fun Facts" subtitle="Quick insights about AI" />
          <ul className={styles.facts}>
            {FUN_FACTS.map((f) => (
              <li key={f.id} className={styles.factItem}>
                <span className={clsx(styles.factDot, toneClass(f.accent))} aria-hidden="true" />
                <span className={styles.factText}>{f.text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className={styles.cta}>
        <div>
          <h2 className={styles.ctaTitle}>Stay curious. Keep learning.</h2>
          <p className={styles.ctaSub}>AI evolves every day. Keep exploring, building and shaping the future.</p>
        </div>
        <button type="button" className={styles.ctaBtn} onClick={() => go("paths")}>
          Explore Learning Paths →
        </button>
      </section>
    </div>
  );
}

function SearchSmall() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true" className={styles.heroSearchIcon}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  );
}

/* Decorative abstract "neural" art for the hero — purely ornamental. */
function HeroArt() {
  return (
    <svg className={styles.heroArt} viewBox="0 0 220 180" fill="none" aria-hidden="true">
      <circle cx="60" cy="40" r="6" fill="var(--g-blue)" />
      <circle cx="150" cy="30" r="5" fill="var(--g-red)" />
      <circle cx="185" cy="90" r="6" fill="var(--g-yellow-ink)" />
      <circle cx="120" cy="95" r="10" fill="var(--g-purple)" />
      <circle cx="55" cy="120" r="5" fill="var(--g-green)" />
      <circle cx="160" cy="150" r="6" fill="var(--g-blue-strong)" />
      <g stroke="var(--color-hairline-strong)" strokeWidth="1.5">
        <line x1="60" y1="40" x2="120" y2="95" />
        <line x1="150" y1="30" x2="120" y2="95" />
        <line x1="185" y1="90" x2="120" y2="95" />
        <line x1="55" y1="120" x2="120" y2="95" />
        <line x1="160" y1="150" x2="120" y2="95" />
      </g>
    </svg>
  );
}
