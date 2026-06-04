/**
 * Second-row nav strip — featured models. Each chip prefills the input and
 * invokes `loadModel`. The currently-loaded model is highlighted.
 */

import { clsx } from "clsx";

import { FEATURED_MODEL_IDS } from "../landing/ExampleChips";
import { useArchStore } from "../../store/archStore";
import styles from "./QuickModels.module.css";

function shortLabel(modelId: string): string {
  const slash = modelId.lastIndexOf("/");
  return slash >= 0 ? modelId.slice(slash + 1) : modelId;
}

type Props = {
  onSubmit: (modelId: string) => void;
};

export function QuickModels({ onSubmit }: Props) {
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

  return (
    <nav aria-label="Featured models" className={styles.nav}>
      {FEATURED_MODEL_IDS.map((model_id) => {
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
