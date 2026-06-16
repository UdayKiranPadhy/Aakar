/**
 * Build guard — relative imports must match the real on-disk file casing.
 *
 * macOS is case-insensitive, so `import "./Foo"` resolves fine locally even when
 * the file is actually `foo.tsx`. The production build then fails on a
 * case-sensitive target (the Docker `node:*-alpine` prod image, most Linux CI/
 * hosts) with "module not found" — the classic "works locally, breaks in
 * deploy". `pnpm build` on a Mac can't catch this; this static audit can.
 *
 * Scope and false-positive policy:
 *   - Only *relative* specifiers (./ and ../). Bare/aliased imports are out of
 *     scope (a deploy build / tsc resolves those).
 *   - A specifier is flagged ONLY when its target exists on disk with a
 *     *different* case. Anything that doesn't resolve (virtual modules, the
 *     `@/*` alias, assets we don't model) is skipped — never flagged.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../src");

const SOURCE_FILE = /\.(?:ts|tsx|js|jsx|cts|mts)$/;
// Extensions tsc/Vite append when a specifier omits one (order = resolution order).
const RESOLVE_EXTS = ["", ".ts", ".tsx", ".d.ts", ".js", ".jsx", ".json", ".css"];
const INDEX_FILES = ["index.ts", "index.tsx", "index.js", "index.jsx"];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (SOURCE_FILE.test(entry.name)) out.push(full);
  }
  return out;
}

/** Every import/export/dynamic-import/require specifier in a source file. */
function specifiers(code: string): string[] {
  const found: string[] = [];
  const patterns = [
    /\bfrom\s*['"]([^'"]+)['"]/g, //          import … from "x" / export … from "x"
    /\bimport\s*['"]([^'"]+)['"]/g, //        import "x"  (side-effect)
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // import("x")
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // require("x")
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) found.push(m[1]);
  }
  return found;
}

/** Resolve a relative specifier to a real file (any case), preserving the
 *  specifier's own casing in the returned path. Null = doesn't resolve. */
function resolveTarget(fromFile: string, spec: string): string | null {
  const base = resolve(dirname(fromFile), spec.replace(/[?#].*$/, "")); // drop ?query/#hash
  for (const ext of RESOLVE_EXTS) {
    const candidate = base + ext;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  if (existsSync(base) && statSync(base).isDirectory()) {
    for (const idx of INDEX_FILES) {
      const candidate = resolve(base, idx);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/** The true on-disk path (relative to SRC) if any segment is cased differently
 *  from `target`; null when every segment already matches. */
function realCasing(target: string): string | null {
  const rel = relative(SRC, target);
  if (rel.startsWith("..")) return null; // outside src/ — out of scope
  let current = SRC;
  const real: string[] = [];
  for (const seg of rel.split(sep)) {
    const entries = readdirSync(current);
    const match = entries.find((e) => e === seg) ?? entries.find((e) => e.toLowerCase() === seg.toLowerCase());
    if (!match) return null; // target exists, so this shouldn't happen — be safe
    real.push(match);
    current = resolve(current, match);
  }
  const realRel = real.join(sep);
  return realRel === rel ? null : realRel;
}

describe("relative imports match on-disk file casing (case-sensitive build safety)", () => {
  it("has no case-mismatched relative imports under src/", () => {
    const problems: string[] = [];
    for (const file of walk(SRC)) {
      for (const spec of specifiers(readFileSync(file, "utf8"))) {
        if (!spec.startsWith(".")) continue; // relative imports only
        const target = resolveTarget(file, spec);
        if (!target) continue; // unresolved → out of scope, never a false positive
        const real = realCasing(target);
        if (real) {
          problems.push(`${relative(SRC, file)}: import "${spec}" → on disk it is "${real}"`);
        }
      }
    }
    expect(problems, `Case-mismatched imports (fine on macOS, break on Linux):\n${problems.join("\n")}`).toEqual([]);
  });
});
