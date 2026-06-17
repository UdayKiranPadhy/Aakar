/**
 * "Fun Facts" quick insights shown on the Overview. Light, broadly-accurate
 * trivia about the field.
 */

import type { FunFact } from "./types";

export const FUN_FACTS: ReadonlyArray<FunFact> = [
  { id: "first-program", text: "The first AI program — a checkers player — dates back to the early 1950s.", accent: "red" },
  { id: "inductive-bias", text: "Transformers make far fewer built-in assumptions about data than CNNs or RNNs.", accent: "blue" },
  { id: "trillion-params", text: "The largest models today have well over a trillion parameters.", accent: "yellow" },
  { id: "pace", text: "AI capability is advancing dramatically faster than it did a decade ago.", accent: "green" },
  { id: "foundation-models", text: "Dozens of new foundation models are released every year.", accent: "purple" },
  { id: "tokens", text: "Frontier models are now trained on tens of trillions of tokens of text.", accent: "teal" },
];
