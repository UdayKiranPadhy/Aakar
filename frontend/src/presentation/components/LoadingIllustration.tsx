/**
 * Spot illustration for the "introspecting architecture" loading state:
 * a faceless analyst with a clipboard watching the model's graph being
 * assembled on screen — a node mesh, a module-cluster of 3D blocks, a stack of
 * network layers feeding an output grid, and a progress bar working below.
 *
 * The artwork is an exported, path-only (font-free) SVG with a viewBox, imported
 * as a static asset URL and rendered as <img> — the same approach as the other
 * state illustrations (ModelNotFoundIllustration / server-error). As an <img>
 * the browser keeps it vector-crisp at any size and only fetches it when this
 * state is shown (no main-bundle cost). Decorative: the surrounding
 * ModelLoadingState carries the heading and the polite live region.
 *
 * A subtle, reduced-motion-aware "breathe" (in the CSS module) keeps the still
 * frame feeling active while we wait.
 */

import illustrationUrl from "./model-loading.svg";
import styles from "./LoadingIllustration.module.css";

export function LoadingIllustration() {
  return <img src={illustrationUrl} alt="" aria-hidden="true" className={styles.img} />;
}
