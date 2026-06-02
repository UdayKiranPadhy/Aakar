/**
 * Full-area error state for the dashboard content when a model fails to load.
 *
 * Replaces the generic "no model loaded" placeholder with a kind-specific
 * illustration, the headline, the backend's detailed message, the relevant
 * facts (model id / architecture / status), and an actionable hint.
 */

import type { LoadError } from "../../application/loadError";
import { ErrorIllustration } from "./ErrorIllustration";
import styles from "./ErrorState.module.css";

export function ErrorState({ error }: { error: LoadError }) {
  const facts: Array<[string, string]> = [];
  if (error.modelId) facts.push(["model", error.modelId]);
  if (error.architecture) facts.push(["architecture", error.architecture]);
  if (error.status != null) facts.push(["status", String(error.status)]);

  return (
    <div className={styles.root} role="alert" aria-live="polite">
      <div className={styles.illustration}>
        <ErrorIllustration kind={error.kind} />
      </div>
      <h2 className={styles.title}>{error.title}</h2>
      <p className={styles.detail}>{error.detail}</p>

      {facts.length > 0 && (
        <dl className={styles.facts}>
          {facts.map(([k, v]) => (
            <div className={styles.fact} key={k}>
              <dt className={styles.factKey}>{k}</dt>
              <dd className={styles.factValue}>{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {error.hint && <p className={styles.hint}>{error.hint}</p>}
    </div>
  );
}
