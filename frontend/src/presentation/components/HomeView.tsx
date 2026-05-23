/**
 * HomeView — compact start surface for the visualizer.
 *
 * The primary controls live in NavBar. This view gives the empty state a real
 * architecture preview instead of filler content.
 */

import styles from "./HomeView.module.css";

const stages = [
  { label: "Tokens", meta: "[B, S]" },
  { label: "Embedding", meta: "[B, S, H]" },
  { label: "Decoder layers", meta: "N × block" },
  { label: "Logits", meta: "[B, S, V]" },
] as const;

const blockFlow = [
  { label: "Norm", tone: "norm" },
  { label: "Attention", tone: "attention" },
  { label: "+", tone: "residual" },
  { label: "MLP", tone: "mlp" },
  { label: "+", tone: "residual" },
] as const;

export function HomeView() {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>LLM architecture visualizer</p>
          <h1 className={styles.title}>Aakar</h1>
          <p className={styles.lead}>
            Inspect the module tree, tensor shapes, parameter scale, and the
            computation flow inside transformer blocks.
          </p>
        </div>
        <div className={styles.preview} aria-label="Architecture preview">
          <div className={styles.stageRail}>
            {stages.map((stage) => (
              <div key={stage.label} className={styles.stage}>
                <span className={styles.stageTitle}>{stage.label}</span>
                <span className={styles.stageMeta}>{stage.meta}</span>
              </div>
            ))}
          </div>
          <div className={styles.blockFlow}>
            {blockFlow.map((item, index) => (
              <div key={`${item.label}-${index}`} className={styles.flowItem}>
                <span className={styles[item.tone]}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.insights} aria-label="Architecture lenses">
        <div>
          <span className={styles.kicker}>Flow</span>
          <h2 className={styles.h2}>Decoder paths stay readable</h2>
          <p className={styles.p}>
            Layer stacks use compact cells, while block internals switch to
            forward-pass diagrams with residual paths.
          </p>
        </div>
        <div>
          <span className={styles.kicker}>Attention</span>
          <h2 className={styles.h2}>Q/K/V is shown as a fan-in</h2>
          <p className={styles.p}>
            Attention views expose score matrices, softmax, value mixing, and
            grouped-query head shapes.
          </p>
        </div>
        <div>
          <span className={styles.kicker}>Scale</span>
          <h2 className={styles.h2}>Parameters have visual weight</h2>
          <p className={styles.p}>
            Matrix-heavy modules show shape glyphs, memory, FLOPs, and child
            parameter breakdowns in the detail panel.
          </p>
        </div>
      </section>
    </div>
  );
}
