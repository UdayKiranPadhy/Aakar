/**
 * Interactive learning tools listed in the Interactive Visualizations section
 * (and previewed on the Overview). These are forward-looking entries — the
 * Learn surface itself stays offline — so each carries a status.
 */

import type { VizTool } from "./types";

export const VIZ_TOOLS: ReadonlyArray<VizTool> = [
  {
    id: "transformer-explorer",
    name: "Transformer Explorer",
    blurb: "Step through a Transformer block and watch a token flow from input to logits.",
    concept: "Transformers",
    status: "Coming soon",
    tone: "blue",
  },
  {
    id: "attention-visualizer",
    name: "Attention Visualizer",
    blurb: "See attention weights light up between tokens, head by head.",
    concept: "Attention",
    status: "Coming soon",
    tone: "purple",
  },
  {
    id: "tokenizer-playground",
    name: "Tokenizer Playground",
    blurb: "Type any text and see exactly how it splits into tokens and ids.",
    concept: "Tokenization",
    status: "Coming soon",
    tone: "yellow",
  },
  {
    id: "embeddings-projector",
    name: "Embeddings Projector",
    blurb: "Explore word and sentence embeddings projected into 2D / 3D space.",
    concept: "Embeddings",
    status: "Coming soon",
    tone: "green",
  },
  {
    id: "diffusion-steps",
    name: "Diffusion Steps",
    blurb: "Watch an image emerge from noise across the denoising steps.",
    concept: "Diffusion Models",
    status: "Coming soon",
    tone: "red",
  },
  {
    id: "nn-playground",
    name: "Neural Net Playground",
    blurb: "Train a tiny network in the browser and watch it learn a decision boundary.",
    concept: "Neural Networks",
    status: "Coming soon",
    tone: "teal",
  },
];
