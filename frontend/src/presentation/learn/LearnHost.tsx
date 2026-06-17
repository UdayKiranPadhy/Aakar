/**
 * Learn — a standalone, backend-free study surface. Mirrors the model dashboard
 * and Compare layouts: a left navigation rail (`LearnSidebar`) beside the active
 * section, resolved from the `LearnViewRegistry` — one section visible at a time.
 *
 * Everything Learn renders is statically authored content bundled with the app
 * (see `learn/content/*`); it never calls the introspection backend. Keying the
 * scroll container on `learnView` resets scroll position on section change.
 */

import { useArchStore } from "../../store/archStore";
import { learnViewRegistry } from "../learn-views/LearnViewRegistry";
import { PlaceholderScreen } from "../components/PlaceholderScreen";
import { LearnSidebar } from "./LearnSidebar";
import styles from "./LearnHost.module.css";

export function LearnHost() {
  const learnView = useArchStore((s) => s.learnView);
  const View = learnViewRegistry.resolve(learnView);

  return (
    <div className={styles.page}>
      <LearnSidebar />
      <section key={learnView} className={styles.content}>
        {View ? (
          <View />
        ) : (
          <PlaceholderScreen
            title="Unknown section"
            message={`No Learn section is registered for '${learnView}'.`}
          />
        )}
      </section>
    </div>
  );
}
