/**
 * Renders model-card markdown. Uses react-markdown + remark-gfm (tables,
 * autolinks). Crucially, `rehype-raw` is NOT included, so any raw HTML/script
 * embedded in a model card is rendered as inert text — safe by default. Output
 * is scoped under a hashed `.prose` class so styles can't leak.
 */

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import styles from "./Markdown.module.css";

const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
};

// Model cards open with a YAML frontmatter block (language / license / tags).
// We surface that metadata in the header already, and react-markdown renders it
// as stray text — so drop a leading `---\n…\n---` block before rendering.
function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^﻿?\s*---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

export function Markdown({ source }: { source: string }) {
  return (
    <div className={styles.prose}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {stripFrontmatter(source)}
      </ReactMarkdown>
    </div>
  );
}
