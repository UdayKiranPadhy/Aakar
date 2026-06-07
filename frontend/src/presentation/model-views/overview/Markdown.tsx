/**
 * Renders model-card markdown. Uses react-markdown + remark-gfm (tables,
 * autolinks). Model cards routinely embed raw HTML (e.g. benchmark tables), so
 * `rehype-raw` parses it — but `rehype-sanitize` runs immediately after with an
 * allow-list, dropping scripts, event handlers, inline styles and unsafe URLs.
 * Surviving elements are styled by our own `.prose` CSS, so the card stays on
 * brand and can't inject markup. Output is scoped under a hashed `.prose` class.
 *
 * Relative image/link URLs in the card are rewritten to absolute Hub URLs (see
 * `hubUrlTransform`) so figures hosted in the repo render instead of 404-ing
 * against our own origin.
 */

import ReactMarkdown, { type Components, defaultUrlTransform } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import styles from "./Markdown.module.css";

// Extend the GitHub-flavoured allow-list with the table attributes model cards
// lean on for layout — section-spanning header rows (colSpan) and cell aligns.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    td: [...(defaultSchema.attributes?.td ?? []), "colSpan", "rowSpan", "align"],
    th: [...(defaultSchema.attributes?.th ?? []), "colSpan", "rowSpan", "align"],
  },
};

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

// Model-card READMEs reference images and links with repo-relative paths (e.g.
// `figures/x.png`). On huggingface.co those resolve against the repo's
// `resolve/<rev>/` path; rendered in our app they'd resolve against our own
// origin and break. Rewrite relative URLs to absolute Hub `resolve/main` URLs.
// Absolute URLs, protocol-relative URLs and #anchors pass through untouched;
// rehype-sanitize still enforces protocol safety on the result.
function hubUrlTransform(modelId: string): (url: string) => string {
  const base = modelId ? `https://huggingface.co/${modelId}/resolve/main/` : null;
  return (url) => {
    const safe = defaultUrlTransform(url);
    if (!base || !safe || safe.startsWith("#")) return safe;
    if (/^[a-z][a-z0-9+.-]*:/i.test(safe) || safe.startsWith("//")) return safe;
    try {
      return new URL(safe, base).href;
    } catch {
      return safe;
    }
  };
}

export function Markdown({ source, modelId }: { source: string; modelId: string }) {
  return (
    <div className={styles.prose}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
        components={components}
        urlTransform={hubUrlTransform(modelId)}
      >
        {stripFrontmatter(source)}
      </ReactMarkdown>
    </div>
  );
}
