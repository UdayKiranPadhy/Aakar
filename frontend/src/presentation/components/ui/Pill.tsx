import { type ReactNode } from "react";
import { clsx } from "clsx";

import styles from "./Pill.module.css";

type Tone = "accent" | "neutral";

type Props = {
  tone?: Tone;
  children: ReactNode;
  className?: string;
};

const TONE_CLASSES: Record<Tone, string> = {
  accent: styles.accent ?? "",
  neutral: styles.neutral ?? "",
};

export function Pill({ tone = "accent", children, className }: Props) {
  return (
    <span className={clsx(styles.pill, TONE_CLASSES[tone], className)}>
      {children}
    </span>
  );
}
