/**
 * Leading AI organisations shown in the AI Companies section. Factual, public
 * information about each lab and its best-known models.
 */

import type { Company } from "./types";

export const COMPANIES: ReadonlyArray<Company> = [
  {
    id: "openai",
    name: "OpenAI",
    keyModels: "GPT-4o, o1",
    founded: 2015,
    focus: "Frontier general-purpose models and the ChatGPT product that brought LLMs mainstream.",
    tone: "green",
  },
  {
    id: "google-deepmind",
    name: "Google DeepMind",
    keyModels: "Gemini, Imagen",
    founded: 2010,
    focus: "Multimodal Gemini models, AlphaFold and a long line of reinforcement-learning research.",
    tone: "blue",
  },
  {
    id: "meta-ai",
    name: "Meta AI",
    keyModels: "Llama 3, Code Llama",
    founded: 2013,
    focus: "Open-weight Llama models that seeded much of the open LLM ecosystem.",
    tone: "blue",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    keyModels: "Claude 3",
    founded: 2021,
    focus: "Safety-focused frontier models and research on alignment and interpretability.",
    tone: "yellow",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    keyModels: "DeepSeek-R1",
    founded: 2023,
    focus: "Efficient open models, notably strong open reasoning systems.",
    tone: "purple",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    keyModels: "Mistral, Mixtral",
    founded: 2023,
    focus: "Efficient open-weight models, including popular Mixture-of-Experts releases.",
    tone: "red",
  },
  {
    id: "xai",
    name: "xAI",
    keyModels: "Grok",
    founded: 2023,
    focus: "Frontier models with a focus on real-time knowledge and reasoning.",
    tone: "teal",
  },
  {
    id: "cohere",
    name: "Cohere",
    keyModels: "Command, Embed",
    founded: 2019,
    focus: "Enterprise-focused language and embedding models for retrieval and RAG.",
    tone: "purple",
  },
];
