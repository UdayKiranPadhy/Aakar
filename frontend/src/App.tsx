/**
 * App composition root.
 *
 * Wires:
 *   - NavBar (Google-News-style: brand + pill search + icons, then section
 *     tabs + quick-model tabs)
 *   - Home view OR visualizer (Breadcrumb + GenericViewBanner + Canvas +
 *     DetailPanel), gated on the `view` state in the store.
 */

import { useMemo, useState } from "react";

import { useArchitecture } from "./application/useArchitecture";
import { HttpArchitectureRepository } from "./infrastructure/api/HttpArchitectureRepository";
import { useArchStore } from "./store/archStore";
import { Breadcrumb } from "./presentation/components/Breadcrumb";
import { Canvas } from "./presentation/canvas/Canvas";
import { DetailPanel } from "./presentation/details/DetailPanel";
import { GenericViewBanner } from "./presentation/components/GenericViewBanner";
import { HomeView } from "./presentation/components/HomeView";
import { NavBar } from "./presentation/components/NavBar";
import { useScrollDirection } from "./presentation/components/useScrollDirection";
import styles from "./App.module.css";

const DEFAULT_API_URL = "http://localhost:8000";

export function App() {
  // Repository is constructed once for the lifetime of the app.
  const repo = useMemo(
    () => new HttpArchitectureRepository(import.meta.env.VITE_API_URL ?? DEFAULT_API_URL),
    [],
  );
  const { loadModel } = useArchitecture(repo);
  const view = useArchStore((s) => s.view);

  // Track the Home view's scroll container via a callback ref. Stored in
  // state (not a ref) so the hook re-attaches its listener when the element
  // mounts/unmounts on view transitions.
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
  const scrolledDown = useScrollDirection(scrollEl);

  // Only the Home view scrolls today, so collapse the nav only there. If we
  // add other scrolling views (e.g. a Docs page) extend this gate.
  const navCollapsed = view === "home" && scrolledDown;

  return (
    <div className={styles.root}>
      <NavBar onSubmit={loadModel} collapsed={navCollapsed} />

      {view === "visualizer" && (
        <>
          <Breadcrumb />
          <GenericViewBanner />
        </>
      )}

      <main className={styles.main}>
        {view === "home" ? (
          // The inner div is the scroll viewport — main stays overflow:hidden
          // so the page chrome (nav, header) doesn't move while content scrolls.
          <div ref={setScrollEl} className={styles.homeScroll}>
            <HomeView />
          </div>
        ) : (
          <>
            <div className={styles.canvasArea}>
              <Canvas />
            </div>
            <DetailPanel />
          </>
        )}
      </main>
    </div>
  );
}
