/**
 * Compare — a standalone page that pits two models side by side. Both model IDs
 * are entered here (no pre-loading required) into independent store slots; the
 * page renders with zero, one, or two models loaded. A sticky dual-search header
 * and section sub-nav sit above a single scrolling stack of comparison sections.
 *
 * The calculator inputs (batch / sequence / precision) are owned here and shared
 * with the derived sections so their numbers stay consistent.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { useCompareModels } from "../../application/useCompareModels";
import type { Spec } from "../../domain/spec";
import { useArchStore } from "../../store/archStore";
import { Button } from "../components/ui/Button";
import { bytesForDtype } from "../components/ui/dtypeBytes";
import { CompareSearchBar } from "./CompareSearchBar";
import { CompareSectionNav, type CompareSectionDef } from "./CompareSectionNav";
import { deriveSeqMax } from "./helpers/memoryScaling";
import { ArchBreakdownSection } from "./sections/ArchBreakdownSection";
import { AttentionMoeSection } from "./sections/AttentionMoeSection";
import { ConfigDiffSection } from "./sections/ConfigDiffSection";
import { ContextPositionalSection } from "./sections/ContextPositionalSection";
import { FlopsSection } from "./sections/FlopsSection";
import { FormulaSection } from "./sections/FormulaSection";
import { MemoryScalingSection } from "./sections/MemoryScalingSection";
import { SpecDiffSection } from "./sections/SpecDiffSection";
import { VramSection } from "./sections/VramSection";
import type { CalcInputs } from "./types";
import styles from "./CompareHost.module.css";

const SECTIONS: ReadonlyArray<CompareSectionDef> = [
  { id: "specs", label: "Hyperparameters" },
  { id: "config", label: "Config diff" },
  { id: "architecture", label: "Parameters" },
  { id: "attention", label: "Attention & MoE" },
  { id: "context", label: "Context" },
  { id: "vram", label: "Memory" },
  { id: "flops", label: "FLOPs" },
  { id: "scaling", label: "Scaling" },
  { id: "formulas", label: "Formulas" },
];

const DEFAULT_SEQ = 2048;
const SEQ_STEP = 64;

export function CompareHost() {
  const a = useArchStore((s) => s.compareA);
  const b = useArchStore((s) => s.compareB);
  const primaryModelId = useArchStore((s) => s.spec?.model_id ?? null);
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

  const handleSwap = () => {
    swap();
    setInputA(inputB);
    setInputB(inputA);
  };

  return (
    <div className={styles.page}>
      <div className={styles.stickyTop}>
        <div className={styles.header}>
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
        <CompareSectionNav sections={SECTIONS} />
      </div>

      <div className={styles.sections}>
        <SpecDiffSection a={a} b={b} />
        <ConfigDiffSection a={a} b={b} />
        <ArchBreakdownSection a={a} b={b} />
        <AttentionMoeSection a={a} b={b} />
        <ContextPositionalSection a={a} b={b} />
        <VramSection
          a={a}
          b={b}
          calc={calc}
          precision={precision}
          seqMax={seqMax}
          setBatch={setBatch}
          setSeq={setSeq}
          setPrecision={setPrecision}
        />
        <FlopsSection a={a} b={b} calc={calc} />
        <MemoryScalingSection a={a} b={b} calc={calc} />
        <FormulaSection a={a} b={b} calc={calc} />
      </div>
    </div>
  );
}
