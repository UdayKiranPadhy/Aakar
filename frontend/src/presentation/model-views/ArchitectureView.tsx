/**
 * The "Architecture" model-view — the React Flow diagram and its chrome.
 *
 * This is the cluster that used to live directly in App.tsx's visualizer
 * branch (Breadcrumb + ModelInfoStrip + GenericViewBanner above the canvas,
 * with the DetailPanel alongside). Wrapping it as a registered model-view
 * keeps the registry uniform while leaving the canvas/Detail plumbing — and
 * the Canvas `key`-remount on level changes — exactly as it was.
 */

import { Breadcrumb } from "../components/Breadcrumb";
import { GenericViewBanner } from "../components/GenericViewBanner";
import { ModelInfoStrip } from "../components/ModelInfoStrip";
import { Canvas } from "../canvas/Canvas";
import { DetailPanel } from "../details/DetailPanel";
import styles from "./ArchitectureView.module.css";

export function ArchitectureView() {
  return (
    <div className={styles.root}>
      <Breadcrumb />
      <ModelInfoStrip />
      <GenericViewBanner />
      <div className={styles.body}>
        <div className={styles.canvasArea}>
          <Canvas />
        </div>
        <DetailPanel />
      </div>
    </div>
  );
}
