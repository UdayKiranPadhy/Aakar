/**
 * Full-area loading state shown while the backend introspects a model.
 *
 * Rendered by `ModelViewHost` whenever `loading` is set (spec/error are both
 * null mid-fetch). A centered spot illustration carries the mood; the visible
 * heading + the polite live region announce progress to assistive tech.
 */

import { LoadingIllustration } from "./LoadingIllustration";
import styles from "./ModelLoadingState.module.css";

export function ModelLoadingState({ modelId }: { modelId?: string }) {
  return (
    <div className={styles.root} role="status" aria-live="polite">
      <div className={styles.art}>
        <LoadingIllustration />
      </div>

      <h2 className={styles.title}>Building the architecture</h2>
      <p className={styles.message}>
        Introspecting the module tree on the meta device — no weights are downloaded.
      </p>

      {modelId && (
        <div className={styles.requested}>
          <span className={styles.requestedLabel}>loading</span>
          <code className={styles.requestedId}>{modelId}</code>
        </div>
      )}
    </div>
  );
}
