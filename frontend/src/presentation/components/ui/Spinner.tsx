import { clsx } from "clsx";

import styles from "./Spinner.module.css";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={clsx(styles.spinner, className)}
    />
  );
}
