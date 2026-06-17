/**
 * Guided learning paths shown in the Learning Paths section (and previewed on
 * the Overview). Progress percentages are illustrative placeholders.
 */

import type { LearningPath } from "./types";

export const LEARNING_PATHS: ReadonlyArray<LearningPath> = [
  {
    id: "beginner",
    title: "Beginner",
    level: "Beginner",
    blurb: "Start your AI journey",
    lessons: 12,
    progress: 40,
    estHours: 6,
    tone: "blue",
    modules: [
      { title: "What is AI?", lessons: 3, topics: ["History of AI", "AI vs ML vs DL", "Where AI is used"] },
      { title: "Neural Network Basics", lessons: 4, topics: ["Neurons & layers", "Activation functions", "Backpropagation", "Training a model"] },
      { title: "Meet the Transformer", lessons: 3, topics: ["Tokens & embeddings", "Attention, intuitively", "What an LLM does"] },
      { title: "Using LLMs", lessons: 2, topics: ["Prompting basics", "Strengths & limits"] },
    ],
  },
  {
    id: "intermediate",
    title: "Intermediate",
    level: "Intermediate",
    blurb: "Deepen your understanding",
    lessons: 18,
    progress: 25,
    estHours: 12,
    tone: "green",
    modules: [
      { title: "Transformer Internals", lessons: 5, topics: ["Multi-head attention", "Positional encodings", "Residual & norm", "Decoder-only models", "KV cache"] },
      { title: "Training & Adaptation", lessons: 5, topics: ["Pre-training", "Fine-tuning", "LoRA & adapters", "Instruction tuning", "RLHF"] },
      { title: "Retrieval & Embeddings", lessons: 4, topics: ["Embeddings", "Vector search", "RAG pipelines", "Evaluation"] },
      { title: "Decoding & Sampling", lessons: 4, topics: ["Greedy & beam search", "Temperature", "Top-p / top-k", "Structured output"] },
    ],
  },
  {
    id: "advanced",
    title: "Advanced",
    level: "Advanced",
    blurb: "Master cutting-edge topics",
    lessons: 20,
    progress: 10,
    estHours: 18,
    tone: "purple",
    modules: [
      { title: "Scaling & Efficiency", lessons: 5, topics: ["Scaling laws", "Mixture of Experts", "Quantization", "FlashAttention", "Distillation"] },
      { title: "Long Context", lessons: 4, topics: ["RoPE scaling", "Sparse attention", "Memory & KV budgets", "Retrieval hybrids"] },
      { title: "Reasoning & Agents", lessons: 6, topics: ["Chain-of-thought", "Test-time compute", "Tool use", "Planning", "Multi-agent", "Self-correction"] },
      { title: "Alignment & Safety", lessons: 5, topics: ["RLHF & DPO", "Constitutional AI", "Interpretability", "Red-teaming", "Guardrails"] },
    ],
  },
];
