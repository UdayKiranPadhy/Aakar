/**
 * Compare — a standalone page that pits two models side by side. Both model IDs
 * are entered here (no pre-loading required) into independent store slots.
 *
 * Two surfaces, switched on how many models are loaded:
 *   - Cold start (fewer than two loaded) → a full-width landing hero
 *     (`CompareLanding`): a Google-Flights-style dual search, no sidebar.
 *   - Both loaded → the working layout: a sticky dual-search header above a left
 *     navigation rail (`CompareSidebar`) and the active comparison tab, resolved
 *     from the `CompareViewRegistry` — one tab visible at a time.
 *
 * The calculator inputs (batch / sequence / precision) are owned here and shared
 * with the Compute tab via the CompareCalcContext, so its numbers stay consistent.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { useCompareModels } from "../../application/useCompareModels";
import type { Spec } from "../../domain/spec";
import { useArchStore } from "../../store/archStore";
import { compareViewRegistry } from "../compare-views/CompareViewRegistry";
import { PlaceholderScreen } from "../components/PlaceholderScreen";
import { Button } from "../components/ui/Button";
import { bytesForDtype } from "../components/ui/dtypeBytes";
import { CompareLanding } from "./CompareLanding";
import { CompareSearchBar } from "./CompareSearchBar";
import { CompareSidebar } from "./CompareSidebar";
import { deriveSeqMax } from "./helpers/memoryScaling";
import type { CalcInputs, CompareCalcContext } from "./types";
import styles from "./CompareHost.module.css";

const DEFAULT_SEQ = 2048;
const SEQ_STEP = 64;

export function CompareHost() {
  const a = useArchStore((s) => s.compareA);
  const b = useArchStore((s) => s.compareB);
  const compareView = useArchStore((s) => s.compareView);
  const primaryModelId = useArchStore((s) => s.spec?.model_id ?? null);
  const clearCompare = useArchStore((s) => s.clearCompare);
  const { load, swap, a: statusA, b: statusB } = useCompareModels();

  const [inputA, setInputA] = useState(a?.model_id ?? "");
  const [inputB, setInputB] = useState(b?.model_id ?? "");
  const [batch, setBatch] = useState(1);
  const [seq, setSeq] = useState(DEFAULT_SEQ);
  const [precision, setPrecision] = useState(""); // "" = each model's native dtype

  // One-shot prefill of column A from the currently-loaded model (convenience);
  // both bars stay fully editable afterward. Wait until the primary model id is
  // actually known before latching, so prefill still fires if Compare is opened
  // while that model is mid-load.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !primaryModelId) return;
    prefilled.current = true;
    if (!a) {
      setInputA(primaryModelId);
      void load("a", primaryModelId);
    }
  }, [a, primaryModelId, load]);

  const seqMax = useMemo(
    () => deriveSeqMax([a, b].filter((s): s is Spec => s !== null)),
    [a, b],
  );
  // Keep the sequence within the largest available context window.
  useEffect(() => {
    setSeq((s) => Math.min(s, Math.max(seqMax, SEQ_STEP)));
  }, [seqMax]);

  const calc: CalcInputs = useMemo(
    () => ({
      batch,
      seq,
      bytesFor: (spec: Spec) => (precision ? bytesForDtype(precision) : bytesForDtype(spec.param_dtype)),
    }),
    [batch, seq, precision],
  );

  const calcContext: CompareCalcContext = useMemo(
    () => ({ calc, precision, seqMax, setBatch, setSeq, setPrecision }),
    [calc, precision, seqMax],
  );

  const handleSwap = () => {
    swap();
    setInputA(inputB);
    setInputB(inputA);
  };

  // Load both columns at once — the landing's example-pair chips.
  const handlePair = (idA: string, idB: string) => {
    setInputA(idA);
    setInputB(idB);
    void load("a", idA);
    void load("b", idB);
  };

  // Load whatever is currently typed in both fields — the landing's "Compare" button.
  const handleCompare = () => {
    void load("a", inputA);
    void load("b", inputB);
  };

  // Drop both models → back to the cold-start landing (/compare). Also clears the
  // local field text so the landing's searches start empty.
  const handleClear = () => {
    clearCompare();
    setInputA("");
    setInputB("");
  };

  // Cold start: until both columns are loaded, show the standalone landing hero
  // (Google-Flights style) — full-width dual search, no sidebar. As soon as both
  // models are present, the working layout below takes over.
  if (!a || !b) {
    return (
      <CompareLanding
        inputA={inputA}
        inputB={inputB}
        loadedA={a !== null}
        loadedB={b !== null}
        statusA={statusA}
        statusB={statusB}
        onChangeA={setInputA}
        onChangeB={setInputB}
        // Submitting a field (Enter / picking a suggestion) only commits the id
        // into its input — it does NOT load. The comparison starts solely when
        // the user clicks Compare (onCompare), never automatically once both
        // ids are valid. (The example-pair chips remain a one-click compare.)
        onSubmitA={setInputA}
        onSubmitB={setInputB}
        onSwap={handleSwap}
        onCompare={handleCompare}
        onPair={handlePair}
      />
    );
  }

  const View = compareViewRegistry.resolve(compareView);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTools}>
          <button type="button" className={styles.clearBtn} onClick={handleClear}>
            <ClearIcon />
            Clear selection
          </button>
        </div>
        <div className={styles.searchRow}>
          <CompareSearchBar
            label="Model A"
            tone="a"
            value={inputA}
            loading={statusA.loading}
            error={statusA.error}
            onChange={setInputA}
            onSubmit={(id) => void load("a", id)}
          />
          <Button
            variant="ghost"
            size="sm"
            className={styles.swap}
            onClick={handleSwap}
            aria-label="Swap models"
            title="Swap models"
          >
            ⇄
          </Button>
          <CompareSearchBar
            label="Model B"
            tone="b"
            value={inputB}
            loading={statusB.loading}
            error={statusB.error}
            onChange={setInputB}
            onSubmit={(id) => void load("b", id)}
          />
        </div>
      </div>

      <div className={styles.body}>
        <CompareSidebar />
        <section className={styles.content}>
          {View ? (
            <View a={a} b={b} calc={calcContext} />
          ) : (
            <PlaceholderScreen title="Unknown view" message={`No view is registered for '${compareView}'.`} />
          )}
        </section>
      </div>
    </div>
  );
}

function ClearIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
