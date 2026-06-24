/**
 * Syntax highlighting for the detail-panel source viewer.
 *
 * Prism tokenises the source into `<span class="token …">` markup; the actual
 * colours live as `--syntax-*` CSS variables in tokens.css (mapped onto the
 * app's palette), so highlighting stays token-driven like everything else,
 * with nothing code-specific to maintain.
 *
 * Source slices come from torch / transformers, i.e. Python, so Python is the
 * default and the only grammar we register. We honour the snippet's `language`
 * hint when present and fall back to escaped plain text for anything we have no
 * grammar for — never mis-highlight, never break the surrounding <pre>.
 */
import Prism from "prismjs";
import "prismjs/components/prism-python";

const DEFAULT_LANGUAGE = "python";

/** Common hint spellings → Prism grammar keys. */
const ALIASES: Readonly<Record<string, string>> = {
  py: "python",
  python: "python",
};

function escapeHtml(code: string): string {
  return code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function resolveLanguage(hint: string | undefined): string {
  if (!hint) return DEFAULT_LANGUAGE;
  const key = hint.toLowerCase();
  return ALIASES[key] ?? key;
}

/**
 * HTML for `code` with Prism token spans. Falls back to escaped plain text when
 * no grammar is registered for the (resolved) language.
 */
export function highlightToHtml(code: string, language?: string): string {
  const lang = resolveLanguage(language);
  const grammar = Prism.languages[lang];
  if (!grammar) return escapeHtml(code);
  return Prism.highlight(code, grammar, lang);
}
