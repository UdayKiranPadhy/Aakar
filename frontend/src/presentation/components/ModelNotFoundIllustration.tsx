/**
 * "Model not found" spot illustration.
 *
 * The artwork is an outlined (path-only, font-free) SVG with explicit intrinsic
 * dimensions + a viewBox, imported as a static asset URL. As an <img> the
 * browser keeps it vector-crisp at any rendered size and only fetches it when
 * this page is shown (no main-bundle cost). Decorative — the surrounding
 * ModelNotFoundState carries the text and the alert role.
 */

import illustrationUrl from "./model-not-found.svg";
import styles from "./ModelNotFoundState.module.css";

export function ModelNotFoundIllustration() {
  return <img src={illustrationUrl} alt="" aria-hidden="true" className={styles.artImg} />;
}
