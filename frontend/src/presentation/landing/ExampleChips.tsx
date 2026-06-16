/**
 * Row of clickable example-model chips on the landing page.
 * Clicking prefills the input and loads the model.
 */

import { motion } from "framer-motion";

import { useArchStore } from "../../store/archStore";
import { FEATURED_MODEL_IDS } from "../featuredModels";
import { popIn, staggerContainer } from "./motion";
import styles from "./ExampleChips.module.css";

type Props = {
  onSubmit: (modelId: string) => void;
  limit?: number;
};

export function ExampleChips({ onSubmit, limit = 6 }: Props) {
  const setModelInput = useArchStore((s) => s.setModelInput);
  const fetching = useArchStore((s) => s.loading);
  const models = FEATURED_MODEL_IDS.slice(0, limit);

  return (
    <motion.div className={styles.chips} variants={staggerContainer(0.06)}>
      {models.map((model_id) => (
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
