/**
 * The arc of neural-network architectures shown in the Architecture Evolution
 * section — how each generation built on and addressed the limits of the last.
 */

import type { ArchitectureEra } from "./types";

export const ARCHITECTURE_ERAS: ReadonlyArray<ArchitectureEra> = [
  {
    id: "neural-networks",
    name: "Neural Networks",
    era: "1958 – 1980s",
    tagline: "Trainable layers of artificial neurons.",
    description:
      "From Rosenblatt's perceptron to multi-layer networks trained by backpropagation, the foundational idea: stack weighted, non-linear units and learn the weights from data.",
    keyIdeas: ["Perceptron & artificial neurons", "Multi-layer networks", "Backpropagation"],
    examples: "Perceptron, MLP",
    supersedes: "Hand-crafted rules and linear models",
    tone: "blue",
  },
  {
    id: "cnns",
    name: "CNNs",
    era: "1989 – 2010s",
    tagline: "Spatial pattern detectors for images.",
    description:
      "Convolutional networks share weights across an image and exploit locality, learning a hierarchy from edges to objects. AlexNet's 2012 ImageNet win launched the deep-learning era.",
    keyIdeas: ["Convolution & weight sharing", "Pooling & hierarchy", "Translation invariance"],
    examples: "LeNet, AlexNet, ResNet",
    supersedes: "Hand-engineered image features",
    tone: "green",
  },
  {
    id: "rnns",
    name: "RNNs & LSTMs",
    era: "1990s – 2016",
    tagline: "Sequence models with memory.",
    description:
      "Recurrent networks process sequences step by step, carrying a hidden state. LSTMs added gating to remember long-range information, powering translation and speech.",
    keyIdeas: ["Recurrence & hidden state", "Gating (LSTM/GRU)", "Sequence-to-sequence"],
    examples: "LSTM, GRU, Seq2Seq",
    supersedes: "Fixed-window n-gram models",
    tone: "yellow",
  },
  {
    id: "transformers",
    name: "Transformers",
    era: "2017 – present",
    tagline: "Attention replaces recurrence.",
    description:
      "By attending over the whole sequence in parallel, Transformers removed the sequential bottleneck of RNNs and scaled far better — becoming the universal backbone of modern AI.",
    keyIdeas: ["Self-attention", "Parallel training", "Positional encoding"],
    examples: "BERT, T5, the Transformer",
    supersedes: "RNNs & LSTMs for sequence modelling",
    tone: "purple",
  },
  {
    id: "gpt-models",
    name: "GPT / Decoder-only LLMs",
    era: "2018 – present",
    tagline: "Scaling next-token prediction.",
    description:
      "Decoder-only Transformers trained to predict the next token, scaled to billions of parameters, produced general-purpose language models with emergent few-shot abilities.",
    keyIdeas: ["Decoder-only stacks", "Next-token pre-training", "Scaling laws"],
    examples: "GPT-3/4, Llama, Claude",
    supersedes: "Task-specific NLP models",
    tone: "blue",
  },
  {
    id: "moe",
    name: "Mixture of Experts",
    era: "2021 – present",
    tagline: "Sparse capacity for efficient scale.",
    description:
      "MoE layers hold many experts but activate only a few per token, decoupling total parameters from per-token compute — frontier capability at lower inference cost.",
    keyIdeas: ["Sparse expert routing", "Top-k gating", "Capacity vs. compute"],
    examples: "Mixtral, MoE frontier models",
    supersedes: "Dense feed-forward scaling",
    tone: "teal",
  },
  {
    id: "beyond",
    name: "Reasoning & Beyond",
    era: "2024 – present",
    tagline: "Thinking longer, acting in the world.",
    description:
      "The frontier now blends multimodality, long context, test-time reasoning and agentic tool use — plus active research into state-space models and alternatives to attention.",
    keyIdeas: ["Test-time compute", "Agents & tool use", "State-space models (Mamba)"],
    examples: "o-series, DeepSeek-R1, Mamba",
    supersedes: "Single-shot, text-only generation",
    tone: "red",
  },
];
