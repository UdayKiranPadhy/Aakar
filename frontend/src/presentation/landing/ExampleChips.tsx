/**
 * Row of clickable example-model chips. The models are the current trending
 * Hub models (no hardcoded list) — clicking prefills the input and loads the
 * model. While trending loads, shows skeleton chips; on error it renders
 * nothing (the surrounding copy still stands). Used in the Hero and the CTA.
 */

import { motion } from "framer-motion";

import { useTrendingModels } from "../../application/useTrendingModels";
import { useArchStore } from "../../store/archStore";
import { popIn, staggerContainer } from "./motion";
import styles from "./ExampleChips.module.css";

type Props = {
  onSubmit: (modelId: string) => void;
  limit?: number;
};

export function ExampleChips({ onSubmit, limit = 5 }: Props) {
  const { models, loading } = useTrendingModels(limit);
  const setModelInput = useArchStore((s) => s.setModelInput);
  const fetching = useArchStore((s) => s.loading);

  if (loading && models.length === 0) {
    return (
      <div className={styles.chips}>
        {Array.from({ length: limit }, (_, i) => (
          <span key={i} aria-hidden="true" className={styles.skeleton} />
        ))}
      </div>
    );
  }

  return (
    <motion.div className={styles.chips} variants={staggerContainer(0.06)}>
      {models.map(({ model_id }) => (
        <motion.button
          key={model_id}
          type="button"
          variants={popIn}
          className={styles.chip}
          disabled={fetching}
          onClick={() => {
            setModelInput(model_id);
            onSubmit(model_id);
          }}
        >
          {model_id}
        </motion.button>
      ))}
    </motion.div>
  );
}
