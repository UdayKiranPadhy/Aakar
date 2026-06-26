/**
 * Landing hero shown on the Model tab before any model is loaded (replaces the
 * old "No model loaded" placeholder). Left half: the centred pitch + in-page
 * search. Right half: the supplied illustration, filling the half's full height
 * and blending into the white page.
 *
 * The search submits through `onSubmit` (loadModel), so picking a model here
 * drives the normal load + URL sync.
 */

import { useArchStore } from "../../../store/archStore";
import { ModelInputBar } from "../../components/ModelInputBar";
import { CyclingWord } from "../../landing/CyclingWord";
import styles from "./ModelLanding.module.css";

type Props = {
  onSubmit: (modelId: string) => void;
};

// Architecture names cycled in the headline, mirroring the home hero's CyclingWord.
const ARCHITECTURES = ["Llama", "Qwen", "Mistral", "Gemma", "DeepSeek"] as const;

export function ModelLanding({ onSubmit }: Props) {
  // The home "Enter Model" CTA bumps this nonce to focus the search once we land
  // on the (previously empty) Model tab — where the primary search now lives.
  const searchFocusNonce = useArchStore((s) => s.searchFocusNonce);
  return (
    <div className={styles.root}>
      <div className={styles.hero}>
        <div className={styles.copy}>
          <h1 className={styles.headline} aria-label="Explore the anatomy of any AI model">
            <span aria-hidden="true">
              Explore the Anatomy of <CyclingWord words={ARCHITECTURES} />
            </span>
          </h1>

          <p className={styles.lead}>
            Search a Hugging Face model to visualize.
          </p>

          <div className={styles.search}>
            <ModelInputBar onSubmit={onSubmit} focusSignal={searchFocusNonce} />
          </div>
        </div>

        <div className={styles.scene}>
          <img
            className={styles.sceneImg}
            src="/landing-scene.png"
            alt="A person walking toward a model's architecture — input embeddings, multi-head attention, and next-token-prediction output converging on a glowing node."
            width={1090}
            height={951}
          />
        </div>
      </div>
    </div>
  );
}
