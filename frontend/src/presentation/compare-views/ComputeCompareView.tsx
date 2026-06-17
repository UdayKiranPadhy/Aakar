/**
 * Compute tab — the engineering calculators (VRAM, FLOPs, memory scaling,
 * formulas), composed from the existing Compare sections. This is the sole
 * consumer of the shared calculator context the CompareHost threads through.
 */

import { FlopsSection } from "../compare/sections/FlopsSection";
import { FormulaSection } from "../compare/sections/FormulaSection";
import { MemoryScalingSection } from "../compare/sections/MemoryScalingSection";
import { VramSection } from "../compare/sections/VramSection";
import type { CompareViewProps } from "./CompareViewRegistry";

export function ComputeCompareView({ a, b, calc }: CompareViewProps) {
  if (!calc) return null; // the host always supplies the calculator context
  return (
    <>
      <VramSection
        a={a}
        b={b}
        calc={calc.calc}
        precision={calc.precision}
        seqMax={calc.seqMax}
        setBatch={calc.setBatch}
        setSeq={calc.setSeq}
        setPrecision={calc.setPrecision}
      />
      <FlopsSection a={a} b={b} calc={calc.calc} />
      <MemoryScalingSection a={a} b={b} calc={calc.calc} />
      <FormulaSection a={a} b={b} calc={calc.calc} />
    </>
  );
}
