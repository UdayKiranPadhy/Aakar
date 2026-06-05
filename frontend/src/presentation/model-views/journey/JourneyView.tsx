/**
 * Token Journey — a registered model-view that narrates a token's path through
 * the model as an animated left-to-right pipeline.
 *
 * Composition over duplication: rail stops reuse the canvas's block renderer
 * (`blockRegistry`) and the focused-stage detail reuses the dock's detail panel
 * (`detailRegistry`). All derivation is structural (see `domain/tokenJourney`).
 * The pulse glides between stops via a CSS transition; the active stage drives the
 * shape strip, cost overlay, narration, and detail panel.
 */

import {
  Fragment,
  type ReactNode,
  type RefCallback,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { findNodeByPath } from "../../../domain/navigation";
import {
  deriveTokenJourney,
  flattenJourney,
  type JourneyStage,
} from "../../../domain/tokenJourney";
import { useArchStore } from "../../../store/archStore";
import { ViewEmpty, ViewSection } from "../shared/primitives";
import shared from "../shared/primitives.module.css";
import type { ModelViewProps } from "../ModelViewRegistry";
import { CostStrip } from "./CostStrip";
import { JourneyConnector } from "./JourneyConnector";
import { JourneyControls } from "./JourneyControls";
import { JourneyRailCard } from "./JourneyRailCard";
import { ResidualBlock } from "./ResidualBlock";
import { ShapeStrip } from "./ShapeStrip";
import { StageDetail } from "./StageDetail";
import { TokenPulse } from "./TokenPulse";
import { TONE_COLOR, KIND_TONE } from "./tones";
import { useJourneyPlayback } from "./useJourneyPlayback";
import styles from "./JourneyView.module.css";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const LEGEND: ReadonlyArray<[string, string]> = [
  ["io", "input / output"],
  ["embedding", "embedding"],
  ["norm", "normalization"],
  ["attention", "attention"],
  ["residual", "residual"],
  ["mlp", "MLP / FFN"],
  ["matrix", "projection"],
];

export function JourneyView({ spec }: ModelViewProps) {
  const result = useMemo(() => deriveTokenJourney(spec), [spec]);
  const flat = useMemo(() => (result.ok ? flattenJourney(result.journey) : []), [result]);

  // ~1.8s per stage at 1× — a readable study pace; the speed control scales it.
  const [speed, setSpeed] = useState(1);
  const playback = useJourneyPlayback(flat.length, Math.round(1800 / speed));
  const [label, setLabel] = useState("");
  const [batch, setBatch] = useState(() => clamp(spec.flops_reference?.batch_size ?? 1, 1, 8));
  const [seq, setSeq] = useState(() => clamp(spec.flops_reference?.seq_len ?? 512, 64, 4096));

  const railRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const stopEls = useRef(new Map<string, HTMLElement | null>());
  const firstPos = useRef(true);

  const goToExpansion = useArchStore((s) => s.goToExpansion);
  const setModelView = useArchStore((s) => s.setModelView);
  const selectNode = useArchStore((s) => s.selectNode);

  const focused = flat[playback.index] ?? null;
  const prevShape = playback.index > 0 ? (flat[playback.index - 1]?.outputShape ?? null) : null;

  const registerStop = useCallback(
    (id: string): RefCallback<HTMLElement> =>
      (el) => {
        if (el) stopEls.current.set(id, el);
        else stopEls.current.delete(id);
      },
    [],
  );

  const focusStage = useCallback(
    (stage: JourneyStage) => {
      const i = flat.findIndex((s) => s.id === stage.id);
      if (i >= 0) playback.seek(i);
    },
    [flat, playback],
  );

  const seeInside = useCallback(
    (stage: JourneyStage) => {
      if (!stage.nodePath) return;
      const node = findNodeByPath(spec.graph, stage.nodePath);
      if (!node) return;
      if (node.has_internals) {
        goToExpansion(stage.nodePath);
      } else {
        goToExpansion(stage.nodePath.slice(0, -1));
        selectNode(node.id);
      }
      setModelView("architecture");
    },
    [spec, goToExpansion, selectNode, setModelView],
  );

  // Glide the pulse onto the focused stop and center it in view. The pulse's CSS
  // transition animates the move; we also tint it to the stage's tone.
  const position = useCallback(() => {
    const rail = railRef.current;
    const pulse = pulseRef.current;
    if (!rail || !pulse || !focused) return;
    const el = stopEls.current.get(focused.id);
    if (!el) return;
    const rr = rail.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const x = er.left - rr.left + er.width / 2;
    const y = er.top - rr.top + er.height / 2;
    // Place the pulse's center at (x, y) by translating, then offsetting by half
    // its own size. The first placement is instant (no glide from the corner);
    // subsequent moves animate via the CSS `transition: transform`.
    if (firstPos.current) pulse.style.transition = "none";
    pulse.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    pulse.style.setProperty("--tone", TONE_COLOR[KIND_TONE[focused.kind]]);
    if (firstPos.current) {
      void pulse.offsetWidth; // flush the no-transition placement before re-enabling
      pulse.style.transition = "";
      firstPos.current = false;
    }
    const wrap = wrapRef.current;
    if (wrap && typeof wrap.scrollTo === "function") {
      wrap.scrollTo({ left: Math.max(0, x - wrap.clientWidth / 2), behavior: "smooth" });
    }
  }, [focused]);

  useLayoutEffect(() => {
    position();
  }, [position, batch, seq, label]);

  useEffect(() => {
    const onResize = () => position();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [position]);

  if (!result.ok) {
    return (
      <div className={shared.view}>
        <ViewEmpty message="A token journey couldn’t be derived for this architecture — try a standard decoder model (e.g. gpt2, a Llama, or a Qwen)." />
      </div>
    );
  }

  const { journey } = result;
  const hiddenShape = journey.layer?.blocks[0]?.split.outputShape ?? null;
  const pulseLabel = label.trim().split(/\s+/)[0]?.slice(0, 8) || "tok";

  // Build the rail left-to-right, threading a connector before each item that
  // carries the upstream stage's output shape (highlighted when it just changed).
  const railItems: ReactNode[] = [];
  let prev: { shape: string | null; changed: boolean } | null = null;
  const connect = () => {
    if (prev) railItems.push(<JourneyConnector key={`c${railItems.length}`} shape={prev.shape} changed={prev.changed} />);
  };
  const card = (s: JourneyStage) => (
    <JourneyRailCard
      key={s.id}
      spec={spec}
      stage={s}
      active={focused?.id === s.id}
      register={registerStop(s.id)}
      onFocus={focusStage}
      onSeeInside={seeInside}
    />
  );

  for (const s of journey.preStages) {
    connect();
    railItems.push(card(s));
    prev = { shape: s.outputShape, changed: !!s.changedDim };
  }
  if (journey.layer) {
    connect();
    railItems.push(
      <div key="band" className={styles.layerBand}>
        <span className={styles.bandLabel}>Decoder layer · ×{journey.layer.repeat}</span>
        <div className={styles.bandInner}>
          {journey.layer.blocks.map((b, i) => (
            <Fragment key={b.split.id}>
              {i > 0 && <JourneyConnector shape={hiddenShape} />}
              <ResidualBlock
                spec={spec}
                block={b}
                activeId={focused?.id ?? null}
                registerStop={registerStop}
                onFocus={focusStage}
                onSeeInside={seeInside}
              />
            </Fragment>
          ))}
        </div>
      </div>,
    );
    prev = { shape: journey.layer.blocks.at(-1)?.add.outputShape ?? hiddenShape, changed: false };
  }
  for (const s of journey.postStages) {
    connect();
    railItems.push(card(s));
    prev = { shape: s.outputShape, changed: !!s.changedDim };
  }

  return (
    <div className={shared.view}>
      <header className={styles.header}>
        <h2 className={styles.title}>Token Journey</h2>
        <p className={styles.subtitle}>
          How one token’s representation is transformed at each step of <code>{journey.modelId}</code>. Shapes
          for batch <code>B</code>, sequence length <code>S</code> — symbolic (no weights are loaded).
        </p>
        <div className={styles.legend}>
          {LEGEND.map(([tone, text]) => (
            <span key={tone} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: TONE_COLOR[tone as keyof typeof TONE_COLOR] }} />
              {text}
            </span>
          ))}
        </div>
      </header>

      <div className={styles.railWrap} ref={wrapRef}>
        <div className={styles.rail} ref={railRef}>
          {railItems}
          <TokenPulse ref={pulseRef} label={pulseLabel} />
        </div>
      </div>

      <ShapeStrip shape={focused?.outputShape ?? null} prevShape={prevShape} batch={batch} seq={seq} />
      {focused && <CostStrip spec={spec} stage={focused} batch={batch} seq={seq} />}

      <JourneyControls
        playing={playback.playing}
        index={playback.index}
        count={flat.length}
        onToggle={playback.toggle}
        onSeek={playback.seek}
        speed={speed}
        onSpeed={setSpeed}
        label={label}
        onLabel={setLabel}
        batch={batch}
        onBatch={setBatch}
        seq={seq}
        onSeq={setSeq}
      />

      {focused && <p className={styles.caption}>{focused.caption}</p>}

      {focused && (
        <ViewSection title="Stage detail · reused block component">
          <StageDetail spec={spec} stage={focused} onSeeInside={seeInside} />
        </ViewSection>
      )}
    </div>
  );
}
