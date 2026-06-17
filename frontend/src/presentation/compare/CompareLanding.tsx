/**
 * Compare landing — the cold-start surface shown while the Compare page doesn't
 * yet have both models loaded. Modelled on Google Flights: an illustration banner
 * and a light-weight title above a white search card holding two outlined fields
 * (Model A ⇄ Model B) with
 * leading icons and a circular swap between them, and a blue "Compare" pill that
 * floats over the card's bottom edge (their "Explore"). One-click example pairs
 * sit below. No left rail — the full width is the search. Once both columns are
 * loaded, CompareHost swaps this out for the working layout (sidebar + comparison).
 */

import type { SlotStatus } from "../../application/useCompareModels";
import { FEATURED_MODEL_IDS } from "../featuredModels";
import { CompareSearchBar } from "./CompareSearchBar";
import heroArt from "./illustrations/compareHero.svg";
import styles from "./CompareLanding.module.css";

type Props = {
  inputA: string;
  inputB: string;
  loadedA: boolean;
  loadedB: boolean;
  statusA: SlotStatus;
  statusB: SlotStatus;
  onChangeA: (value: string) => void;
  onChangeB: (value: string) => void;
  onSubmitA: (modelId: string) => void;
  onSubmitB: (modelId: string) => void;
  onSwap: () => void;
  /** Load whatever is currently typed in both fields (the "Compare" button). */
  onCompare: () => void;
  /** Load both columns from a preset pair (the example-pair chips). */
  onPair: (idA: string, idB: string) => void;
};

/**
 * Example comparisons, built by pairing the curated featured ids two at a time.
 * Derived from the shared list so they track it — no separate hardcoded set.
 */
function pairUp(ids: ReadonlyArray<string>): ReadonlyArray<readonly [string, string]> {
  const pairs: Array<readonly [string, string]> = [];
  for (let i = 1; i < ids.length; i += 2) {
    const first = ids[i - 1];
    const second = ids[i];
    if (first !== undefined && second !== undefined) pairs.push([first, second]);
  }
  return pairs;
}
const EXAMPLE_PAIRS = pairUp(FEATURED_MODEL_IDS);

/** Short chip label — the model name after the last "/". */
const shortId = (id: string) => id.split("/").pop() ?? id;

export function CompareLanding({
  inputA,
  inputB,
  loadedA,
  loadedB,
  statusA,
  statusB,
  onChangeA,
  onChangeB,
  onSubmitA,
  onSubmitB,
  onSwap,
  onCompare,
  onPair,
}: Props) {
  const canCompare = inputA.trim().length > 0 && inputB.trim().length > 0;
  const busy = statusA.loading || statusB.loading;

  return (
    <div className={styles.landing}>
      <img className={styles.heroArt} src={heroArt} alt="" aria-hidden="true" />
      <div className={styles.inner}>
        <h1 className={styles.title}>Compare models</h1>
        <p className={styles.subtitle}>
          Two HuggingFace models, side by side — structure, parameters, compute and more.
        </p>

        <div className={styles.card}>
          <div className={styles.fields}>
            <CompareSearchBar
              size="lg"
              hideLabel
              label="Model A"
              tone="a"
              leadingIcon={<OriginGlyph />}
              placeholder="Model A — HuggingFace id"
              value={inputA}
              loaded={loadedA}
              loading={statusA.loading}
              error={statusA.error}
              onChange={onChangeA}
              onSubmit={onSubmitA}
            />
            <button
              type="button"
              className={styles.swap}
              onClick={onSwap}
              aria-label="Swap models"
              title="Swap models"
            >
              <SwapGlyph />
            </button>
            <CompareSearchBar
              size="lg"
              hideLabel
              label="Model B"
              tone="b"
              leadingIcon={<DestGlyph />}
              placeholder="Model B — HuggingFace id"
              value={inputB}
              loaded={loadedB}
              loading={statusB.loading}
              error={statusB.error}
              onChange={onChangeB}
              onSubmit={onSubmitB}
            />
          </div>

          <button
            type="button"
            className={styles.compare}
            onClick={onCompare}
            disabled={!canCompare || busy}
          >
            <SearchGlyph />
            Compare
          </button>
        </div>

        {EXAMPLE_PAIRS.length > 0 && (
          <div className={styles.examples}>
            <span className={styles.examplesLabel}>Try a comparison</span>
            <div className={styles.pairs}>
              {EXAMPLE_PAIRS.map(([x, y]) => (
                <button
                  key={`${x}|${y}`}
                  type="button"
                  className={styles.pair}
                  onClick={() => onPair(x, y)}
                  title={`${x} vs ${y}`}
                >
                  <span className={styles.pairA}>{shortId(x)}</span>
                  <span className={styles.pairVs}>vs</span>
                  <span className={styles.pairB}>{shortId(y)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Field glyphs (tinted via currentColor by the field's tone) ──────────── */

function OriginGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function DestGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 3.2 4.5 8.5 4.5 8.5S12.5 9.2 12.5 6A4.5 4.5 0 0 0 8 1.5Zm0 6.2a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4Z" />
    </svg>
  );
}

function SwapGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h9M10 3l3 3-3 3" />
      <path d="M14 12H5M8 15l-3-3 3-3" />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="M11 11l3 3" />
    </svg>
  );
}
