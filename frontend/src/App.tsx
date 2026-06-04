/**
 * App composition root.
 *
 * Layout is a SaaS-style dashboard:
 *   - NavBar (brand + pill search, then app-level tabs: Model / Compare / Learn)
 *   - main area, branched on `appMode`:
 *       home    → the scrolling landing page
 *       model   → ModelSidebar (left) + the active model-view (content)
 *       compare → placeholder (Phase 4)
 *       learn   → placeholder (future)
 *
 * The landing page scrolls inside `homeScroll`; that element is threaded to
 * framer-motion's scroll-driven hooks via ScrollRootContext so reveals and
 * parallax track the correct (inner) scroller rather than the window.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { MotionConfig } from "framer-motion";

import { useArchitecture } from "./application/useArchitecture";
import { HttpArchitectureRepository } from "./infrastructure/api/HttpArchitectureRepository";
import { useArchStore } from "./store/archStore";
import { CompareHost } from "./presentation/compare/CompareHost";
import { ModelSidebar } from "./presentation/components/ModelSidebar";
import { NavBar } from "./presentation/components/NavBar";
import { PlaceholderScreen } from "./presentation/components/PlaceholderScreen";
import { useHideOnScroll } from "./presentation/components/useHideOnScroll";
import { ModelViewHost } from "./presentation/model-views/ModelViewHost";
import { LandingPage } from "./presentation/landing/LandingPage";
import { ScrollRootContext } from "./presentation/landing/ScrollRootContext";
import styles from "./App.module.css";

const DEFAULT_API_URL = "http://localhost:8000";

export function App() {
  // Repository is constructed once for the lifetime of the app.
  const repo = useMemo(
    () => new HttpArchitectureRepository(import.meta.env.VITE_API_URL ?? DEFAULT_API_URL),
    [],
  );
  const { loadModel } = useArchitecture(repo);
  const appMode = useArchStore((s) => s.appMode);
  // The module rail only makes sense once a model actually loaded (a 200 with a
  // Spec). While loading or after an error there's no tree to navigate, so the
  // content area (placeholder / error page) takes the full width.
  const hasSpec = useArchStore((s) => s.spec !== null);

  // Capture the landing page's scroll container. Kept in a ref (handed to
  // framer-motion's whileInView / useScroll via context) AND in state, so the
  // provider subtree only mounts once the element exists — guaranteeing the
  // observers attach to a real node, not a null root (which would fall back to
  // the window and never fire for this inner scroller).
  const scrollRootRef = useRef<HTMLElement | null>(null);
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
  const setScrollRef = useCallback((el: HTMLDivElement | null) => {
    scrollRootRef.current = el;
    setScrollEl(el);
  }, []);

  // Hide the nav on scroll-down, reveal on scroll-up (headroom). Only the home
  // view scrolls (scrollEl is null otherwise), so this is a no-op elsewhere.
  const navHidden = useHideOnScroll(scrollEl);

  return (
    <div className={styles.root}>
      <NavBar onSubmit={loadModel} hidden={navHidden} />

      <main className={styles.main}>
        {appMode === "home" && (
          // The inner div is the scroll viewport (main stays overflow:hidden so
          // the nav doesn't move). It is also the scroll-snap container.
          <div ref={setScrollRef} className={styles.homeScroll}>
            {scrollEl && (
              <MotionConfig reducedMotion="user">
                <ScrollRootContext.Provider value={scrollRootRef}>
                  <LandingPage onSubmit={loadModel} />
                </ScrollRootContext.Provider>
              </MotionConfig>
            )}
          </div>
        )}

        {appMode === "model" && (
          <div className={styles.dashboard}>
            {hasSpec && <ModelSidebar />}
            <section className={styles.content}>
              <ModelViewHost onRetryWithToken={loadModel} />
            </section>
          </div>
        )}

        {appMode === "compare" && <CompareHost />}

        {appMode === "learn" && (
          <PlaceholderScreen
            title="Learn"
            message="Guided LLM-architecture concepts are coming soon."
          />
        )}
      </main>
    </div>
  );
}

