/**
 * Playback + parameterization controls: play/pause, a scrubber over the stage
 * timeline, the optional example-token label, and Batch/Seq sliders that drive
 * the shape strip and cost overlay (the slider pattern mirrors the Compute view).
 */

import styles from "./JourneyView.module.css";

export function JourneyControls({
  playing,
  index,
  count,
  onToggle,
  onSeek,
  speed,
  onSpeed,
  label,
  onLabel,
  batch,
  onBatch,
  seq,
  onSeq,
}: {
  playing: boolean;
  index: number;
  count: number;
  onToggle: () => void;
  onSeek: (i: number) => void;
  speed: number;
  onSpeed: (v: number) => void;
  label: string;
  onLabel: (v: string) => void;
  batch: number;
  onBatch: (v: number) => void;
  seq: number;
  onSeq: (v: number) => void;
}) {
  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.play}
        onClick={onToggle}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <input
        className={styles.scrub}
        type="range"
        min={0}
        max={Math.max(0, count - 1)}
        value={index}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Scrub the token through the model"
      />
      <label className={styles.field}>
        speed
        <select
          className={styles.select}
          value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))}
          aria-label="Playback speed"
        >
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
        </select>
      </label>
      <label className={styles.field}>
        batch
        <input type="range" min={1} max={8} value={batch} onChange={(e) => onBatch(Number(e.target.value))} aria-label="Batch size" />
        <b>{batch}</b>
      </label>
      <label className={styles.field}>
        seq
        <input type="range" min={64} max={4096} step={64} value={seq} onChange={(e) => onSeq(Number(e.target.value))} aria-label="Sequence length" />
        <b>{seq}</b>
      </label>
      <label className={styles.field}>
        token
        <input
          type="text"
          value={label}
          maxLength={24}
          placeholder="the cat sat"
          onChange={(e) => onLabel(e.target.value)}
          aria-label="Optional example token label"
        />
      </label>
    </div>
  );
}
