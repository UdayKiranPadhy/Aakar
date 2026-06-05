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
  const modelView = useArchStore((s) => s.modelView);
  const hasSpec = useArchStore((s) => s.spec !== null);
  const error = useArchStore((s) => s.error);
  // Show the sidebar for partial failures where the model id is known and at
  // least the Overview + Research tabs can still fetch from the HF Hub.
  const showSidebar =
    hasSpec ||
    ((error?.kind === "unsupported" || error?.kind === "gated") && !!error.modelId);

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

  // Model dashboard: collapse just the nav's top row (brand + search) on
  // scroll-down, keeping the section tabs pinned. The real scroller is each
  // view's own `.view` element (which remounts per view), so we listen on the
  // stable `.content` wrapper in the capture phase and re-arm on view change.
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);
  const setContentRef = useCallback((el: HTMLElement | null) => setContentEl(el), []);
  const navCompact = useHideOnScroll(contentEl, { capture: true, resetKey: modelView });

  return (
    <div className={styles.root}>
      <NavBar onSubmit={loadModel} hidden={navHidden} compact={navCompact} />

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
            {showSidebar && <ModelSidebar />}
            <section ref={setContentRef} className={styles.content}>
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

