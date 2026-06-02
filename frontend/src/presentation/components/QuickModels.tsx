/**
 * Second-row nav strip — trending HuggingFace models (no hardcoded list).
 *
 * Each chip prefills the input + invokes `loadModel`. The currently-loaded
 * model (if it's in the trending set) is highlighted. Labels are the short
 * model name; the full id is the tooltip + what gets loaded.
 */

import { clsx } from "clsx";

import { useTrendingModels } from "../../application/useTrendingModels";
import { useArchStore } from "../../store/archStore";
import styles from "./QuickModels.module.css";

const CHIP_COUNT = 6;

function shortLabel(modelId: string): string {
  const slash = modelId.lastIndexOf("/");
  return slash >= 0 ? modelId.slice(slash + 1) : modelId;
}

type Props = {
  onSubmit: (modelId: string) => void;
};

export function QuickModels({ onSubmit }: Props) {
  const { models, loading } = useTrendingModels(CHIP_COUNT);
  const currentModel = useArchStore((s) => s.spec?.model_id);
  const appMode = useArchStore((s) => s.appMode);
  const setModelInput = useArchStore((s) => s.setModelInput);
  const setAppMode = useArchStore((s) => s.setAppMode);
  const fetching = useArchStore((s) => s.loading);

  // If this model is already loaded, just switch back to its dashboard.
  const handlePick = (modelId: string) => {
    if (currentModel === modelId) {
      setAppMode("model");
      return;
    }
    setModelInput(modelId);
    onSubmit(modelId);
  };

  if (loading && models.length === 0) {
    return (
      <nav aria-label="Trending models" className={styles.nav}>
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} aria-hidden="true" className={styles.skeleton} />
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Trending models" className={styles.nav}>
      {models.map(({ model_id }) => {
        const isActive = appMode === "model" && currentModel === model_id;
        return (
          <button
            key={model_id}
            type="button"
            onClick={() => handlePick(model_id)}
            disabled={fetching}
            title={model_id}
            aria-current={isActive ? "page" : undefined}
            className={clsx(styles.tab, isActive && styles.tabActive)}
          >
            {shortLabel(model_id)}
            {isActive && <span aria-hidden="true" className={styles.underline} />}
          </button>
        );
      })}
    </nav>
  );
}
