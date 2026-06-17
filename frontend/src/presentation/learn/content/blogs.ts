/**
 * Curated blog posts & articles shown in the Blogs & Articles section.
 * Placeholder content illustrating the intended look — authors and topics are
 * representative of the kind of writing the section curates.
 */

import type { Blog } from "./types";

export const BLOGS: ReadonlyArray<Blog> = [
  {
    id: "flashattention",
    title: "Understanding FlashAttention: The Memory Revolution",
    author: "Tri Dao",
    date: "May 8, 2024",
    readMinutes: 10,
    summary:
      "How an IO-aware attention algorithm slashes memory traffic and speeds up Transformers without approximations.",
    tags: ["Attention", "Performance", "GPU"],
    accent: "blue",
  },
  {
    id: "rag-future",
    title: "Why RAG is the Future of LLM Applications",
    author: "Lewis Lin",
    date: "Apr 24, 2024",
    readMinutes: 8,
    summary:
      "Retrieval-Augmented Generation grounds models in your own data — reducing hallucination and keeping answers current.",
    tags: ["RAG", "Embeddings", "Applications"],
    accent: "green",
  },
  {
    id: "moe-simple",
    title: "Mixture of Experts, Explained Simply",
    author: "Jason Ho",
    date: "Apr 12, 2024",
    readMinutes: 12,
    summary:
      "A plain-English tour of sparse expert routing and why it gives you a huge model for a fraction of the compute.",
    tags: ["MoE", "Architecture", "Efficiency"],
    accent: "purple",
  },
  {
    id: "rlhf-intent",
    title: "RLHF: Aligning AI with Human Intent",
    author: "Research Team",
    org: "OpenAI",
    date: "Mar 28, 2024",
    readMinutes: 9,
    summary:
      "From preference data to reward models to policy optimisation — how human feedback shapes model behaviour.",
    tags: ["RLHF", "Alignment", "Training"],
    accent: "red",
  },
  {
    id: "tokenizers",
    title: "A Practical Guide to Tokenizers",
    author: "Maya Patel",
    date: "Mar 10, 2024",
    readMinutes: 7,
    summary:
      "Why token count drives both context limits and cost — and how BPE quietly shapes everything a model sees.",
    tags: ["Tokenization", "BPE", "Fundamentals"],
    accent: "yellow",
  },
  {
    id: "scaling-laws",
    title: "Scaling Laws, Revisited",
    author: "Daniel Reeves",
    date: "Feb 22, 2024",
    readMinutes: 11,
    summary:
      "What Chinchilla taught us about balancing parameters and data — and what compute-optimal really means.",
    tags: ["Scaling", "Training", "Compute"],
    accent: "teal",
  },
  {
    id: "long-context",
    title: "The Long-Context Playbook",
    author: "Priya Nair",
    date: "Feb 3, 2024",
    readMinutes: 9,
    summary:
      "RoPE scaling, attention tricks and KV-cache budgets: how models stretch from 4K to millions of tokens.",
    tags: ["Long Context", "RoPE", "KV Cache"],
    accent: "blue",
  },
  {
    id: "agents-2024",
    title: "From Chatbots to Agents",
    author: "Marcus Webb",
    date: "Jan 19, 2024",
    readMinutes: 10,
    summary:
      "Tool use, planning and feedback loops — the ingredients turning language models into autonomous workers.",
    tags: ["Agents", "Tool Use", "Reasoning"],
    accent: "purple",
  },
];
