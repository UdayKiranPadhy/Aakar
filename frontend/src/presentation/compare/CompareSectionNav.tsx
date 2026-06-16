/**
 * Sticky in-page anchor nav for the Compare sections. Highlights whichever
 * section is currently in view via an IntersectionObserver. The section list is
 * passed in (shared with CompareHost) so nav and content can never drift.
 */

import { useEffect, useState } from "react";
import { clsx } from "clsx";

import styles from "./CompareSectionNav.module.css";

export type CompareSectionDef = Readonly<{ id: string; label: string }>;

export function CompareSectionNav({ sections }: { sections: ReadonlyArray<CompareSectionDef> }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const onscreen = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (onscreen[0]) setActive(onscreen[0].target.id);
      },
      // Treat the band ~20%–30% down the viewport as "current".
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className={styles.nav} aria-label="Comparison sections">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={clsx(styles.link, active === s.id && styles.active)}
          aria-current={active === s.id ? "true" : undefined}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}
