/**
 * Second-row nav strip — quick-pick HuggingFace model IDs.
 *
 * Mirrors Google News's section-tabs row. Each chip is a navigation shortcut
 * that prefills the input + invokes `loadModel`. The currently-loaded preset
 * (if any) is highlighted with an underline in the accent color.
 *
 * To add a new preset: append to `MODELS`. Keep the list small — these are
 * curated examples for the families Aakar's adapters support today.
 */

import { clsx } from "clsx";

import { useArchStore } from "../../store/archStore";
import styles from "./QuickModels.module.css";

type QuickModel = Readonly<{
  label: string;
  modelId: string;
}>;

const MODELS: ReadonlyArray<QuickModel> = [
  { label: "GPT-2", modelId: "gpt2" },
  { label: "Llama-3-8B", modelId: "meta-llama/Meta-Llama-3-8B" },
  { label: "Mistral-7B", modelId: "mistralai/Mistral-7B-v0.1" },
  { label: "Qwen2.5-7B", modelId: "Qwen/Qwen2.5-7B-Instruct" },
  { label: "Qwen3-0.6B", modelId: "Qwen/Qwen3-0.6B" },
];

type Props = {
  onSubmit: (modelId: string) => void;
};

export function QuickModels({ onSubmit }: Props) {
  const currentModel = useArchStore((s) => s.spec?.model_id);
  const view = useArchStore((s) => s.view);
  const setModelInput = useArchStore((s) => s.setModelInput);
  const setView = useArchStore((s) => s.setView);
  const loading = useArchStore((s) => s.loading);

  // If the user is on Home but this model is already loaded, just switch back
  // to the visualizer (no need to re-fetch). Otherwise prefill + fetch.
  const handlePick = (modelId: string) => {
    if (currentModel === modelId) {
      setView("visualizer");
      return;
    }
    setModelInput(modelId);
    onSubmit(modelId);
  };

  return (
    <nav aria-label="Example models" className={styles.nav}>
      {MODELS.map(({ label, modelId }) => {
        const isActive = view === "visualizer" && currentModel === modelId;
        return (
          <button
            key={modelId}
            type="button"
            onClick={() => handlePick(modelId)}
            disabled={loading}
            aria-current={isActive ? "page" : undefined}
            className={clsx(styles.tab, isActive && styles.tabActive)}
          >
            {label}
            {isActive && <span aria-hidden="true" className={styles.underline} />}
          </button>
        );
      })}
    </nav>
  );
}
