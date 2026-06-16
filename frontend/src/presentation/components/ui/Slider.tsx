/**
 * Labeled range slider with its current value shown inline. Shared by the
 * Compute view and the Compare page's derived calculators.
 */

import styles from "./Slider.module.css";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

export function Slider({ label, value, min, max, step = 1, onChange }: Props) {
  return (
    <label className={styles.slider}>
      <span className={styles.sliderLabel}>
        {label}
        <strong className={styles.sliderValue}>{value.toLocaleString()}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
