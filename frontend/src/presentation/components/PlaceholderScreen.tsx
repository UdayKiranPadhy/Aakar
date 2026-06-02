/**
 * A centered empty/coming-soon panel, reused by not-yet-built surfaces
 * (Compare, Learn) and by model-views that arrive in a later phase.
 */

import styles from "./PlaceholderScreen.module.css";

type Props = {
  title: string;
  message: string;
};

export function PlaceholderScreen({ title, message }: Props) {
  return (
    <div className={styles.root}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
