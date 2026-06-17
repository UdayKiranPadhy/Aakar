/**
 * Timeline — the AI evolution story. Two modes share one decade filter:
 *   - Timeline View: a decade rail, a scrollable master list of milestones, and
 *     a rich detail panel for the selected one (summary, impact, related ideas).
 *   - Table View: the same milestones as a dense, scannable table.
 *
 * All content is static (`content/timeline`); nothing here touches the backend.
 */

import { useMemo, useState } from "react";
import { clsx } from "clsx";

import { DECADE_ERAS, TIMELINE_EVENTS } from "../learn/content/timeline";
import type { Decade, TimelineEvent } from "../learn/content/types";
import {
  CategoryChip,
  FilterChips,
  PageHeader,
  Segmented,
  StarRating,
  Tag,
  categoryTone,
  toneClass,
} from "../learn/primitives";
import styles from "./TimelineLearnView.module.css";

type Mode = "timeline" | "table";
const ALL = "All Time";

const FILTERS = [ALL, ...DECADE_ERAS.map((d) => d.decade)] as const;

const EVENTS = [...TIMELINE_EVENTS].sort((a, b) => a.sortYear - b.sortYear);

/** Initials of a figure / lab, for the offline avatar tile. */
function initials(name: string): string {
  const parts = name.split(/[\s,]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "AI";
}

export function TimelineLearnView() {
  const [mode, setMode] = useState<Mode>("timeline");
  const [filter, setFilter] = useState<string>(ALL);
  const [selectedId, setSelectedId] = useState<string>(EVENTS[0]?.id ?? "");

  const events = useMemo(
    () => (filter === ALL ? EVENTS : EVENTS.filter((e) => e.decade === filter)),
    [filter],
  );
  const selected = events.find((e) => e.id === selectedId) ?? events[0];
  const selectedIndex = selected ? events.findIndex((e) => e.id === selected.id) : -1;

  const select = (e: TimelineEvent) => {
    setSelectedId(e.id);
    if (mode === "table") setMode("timeline");
  };

  const filterToDecade = (decade: Decade) => {
    setFilter(decade);
    const first = EVENTS.find((e) => e.decade === decade);
    if (first) setSelectedId(first.id);
  };

  return (
    <div className={styles.view}>
      <PageHeader
        title="AI Timeline"
        subtitle="Explore the key milestones, breakthroughs and turning points that shaped the evolution of Artificial Intelligence."
        actions={
          <Segmented<Mode>
            ariaLabel="Timeline display"
            value={mode}
            onChange={setMode}
            options={[
              { value: "timeline", label: "Timeline" },
              { value: "table", label: "Table View" },
            ]}
          />
        }
      />

      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

      {mode === "timeline" && (
        <div className={styles.decadeRail}>
          {DECADE_ERAS.map((era) => {
            const active = filter === era.decade;
            return (
              <button
                key={era.decade}
                type="button"
                className={clsx(styles.decade, active && styles.decadeActive)}
                onClick={() => filterToDecade(era.decade)}
              >
                <span className={clsx(styles.decadeDot, toneClass(era.tone))}>
                  {era.decade.replace("19", "").replace("20", "")}
                </span>
                <span className={styles.decadeLabel}>{era.decade}</span>
                <span className={styles.decadeTitle}>{era.title}</span>
                <span className={styles.decadeSub}>{era.subtitle}</span>
              </button>
            );
          })}
        </div>
      )}

      {mode === "timeline" ? (
        <div className={styles.split}>
          <ol className={styles.master}>
            {events.map((e) => {
              const active = selected?.id === e.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    className={clsx(styles.masterItem, active && styles.masterItemActive)}
                    onClick={() => select(e)}
                    aria-current={active ? "true" : undefined}
                  >
                    <span className={clsx(styles.rail, toneClass(categoryTone(e.category)))}>
                      <span className={styles.railDot} />
                    </span>
                    <span className={styles.masterText}>
                      <span className={styles.masterYear}>{e.year}</span>
                      <span className={styles.masterTitle}>{e.title}</span>
                      <span className={styles.masterTagline}>{e.tagline}</span>
                    </span>
                    <span aria-hidden="true" className={styles.chevron}>›</span>
                  </button>
                </li>
              );
            })}
          </ol>

          {selected && (
            <aside className={styles.detail} key={selected.id}>
              <div className={styles.detailHead}>
                <div className={styles.detailHeadText}>
                  <span className={clsx(styles.yearChip, toneClass(categoryTone(selected.category)))}>
                    {selected.year}
                  </span>
                  <h2 className={styles.detailTitle}>{selected.title}</h2>
                  <p className={styles.detailTagline}>{selected.tagline}</p>
                </div>
                {selected.figure && (
                  <div className={styles.figure}>
                    <span className={clsx(styles.figureAvatar, toneClass(categoryTone(selected.category)))}>
                      {initials(selected.figure)}
                    </span>
                    <span className={styles.figureName}>{selected.figure}</span>
                  </div>
                )}
              </div>

              <p className={styles.detailSummary}>{selected.summary}</p>

              <div className={styles.chips}>
                <CategoryChip category={selected.category} />
                <span className={styles.impactInline}>
                  <StarRating value={selected.impact} /> Impact
                </span>
              </div>

              <section className={styles.detailSection}>
                <h3 className={styles.detailSubhead}>Why it mattered</h3>
                <ul className={styles.impactList}>
                  {selected.details.map((d) => (
                    <li key={d} className={styles.impactItem}>
                      <span aria-hidden="true" className={styles.tick}>✓</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </section>

              <section className={styles.detailSection}>
                <h3 className={styles.detailSubhead}>Related concepts</h3>
                <div className={styles.tagRow}>
                  {selected.relatedConcepts.map((c) => (
                    <Tag key={c}>{c}</Tag>
                  ))}
                </div>
              </section>

              <div className={styles.detailFooter}>
                <div className={styles.exploreLinks}>
                  {selected.links?.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className={styles.exploreLink}>
                      {l.label} <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                  <span className={styles.exploreEra}>Era: {selected.decade}</span>
                </div>
                <div className={styles.nav}>
                  <button
                    type="button"
                    className={styles.navBtn}
                    disabled={selectedIndex <= 0}
                    onClick={() => {
                      const prev = events[selectedIndex - 1];
                      if (prev) setSelectedId(prev.id);
                    }}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    className={clsx(styles.navBtn, styles.navNext)}
                    disabled={selectedIndex < 0 || selectedIndex >= events.length - 1}
                    onClick={() => {
                      const next = events[selectedIndex + 1];
                      if (next) setSelectedId(next.id);
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Year</th>
                <th>Milestone</th>
                <th>Description</th>
                <th>Category</th>
                <th>Impact</th>
                <th>Explore</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className={styles.tYear}>
                    <span className={clsx(styles.tDot, toneClass(categoryTone(e.category)))} />
                    {e.year}
                  </td>
                  <td className={styles.tTitle}>{e.title}</td>
                  <td className={styles.tDesc}>{e.tagline}</td>
                  <td>
                    <CategoryChip category={e.category} />
                  </td>
                  <td>
                    <StarRating value={e.impact} />
                  </td>
                  <td>
                    <button type="button" className={styles.tLink} onClick={() => select(e)}>
                      View details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.banner}>
        <div className={styles.bannerIcon} aria-hidden="true">
          🗓
        </div>
        <div className={styles.bannerText}>
          <p className={styles.bannerTitle}>
            {mode === "timeline" ? "Want the complete view?" : "Tip: Use Timeline View for a visual journey"}
          </p>
          <p className={styles.bannerSub}>
            {mode === "timeline"
              ? "Browse the full AI timeline in a dense table, or explore by decade."
              : "Switch back to Timeline View to explore events interactively with rich details."}
          </p>
        </div>
        <button
          type="button"
          className={styles.bannerBtn}
          onClick={() => setMode(mode === "timeline" ? "table" : "timeline")}
        >
          {mode === "timeline" ? "Switch to Table View" : "Switch to Timeline View"}
        </button>
      </div>
    </div>
  );
}
