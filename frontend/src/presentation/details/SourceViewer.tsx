/**
 * "View source" expander for the detail panel. Lazily fetches the source slice
 * behind a module's `source_url` (only when opened) and shows it in a <pre>.
 */

import { useState } from "react";

import { useSource } from "../../application/useResearch";
import styles from "./SourceViewer.module.css";

export function SourceViewer({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? "Hide source" : "View source"}
      </button>
      {open && <SourceBody url={url} />}
    </div>
  );
}

function SourceBody({ url }: { url: string }) {
  // Mounted only while open, so the fetch is lazy.
  const { snippet, loading, error } = useSource(url);
  if (loading) return <p className={styles.status}>Loading source…</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!snippet) return null;
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        {snippet.path} · L{snippet.start_line}–{snippet.end_line}
      </figcaption>
      <pre className={styles.pre}>
        <code>{snippet.code}</code>
      </pre>
    </figure>
  );
}
