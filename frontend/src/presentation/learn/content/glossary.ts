/**
 * Glossary of AI / LLM terms. Concise, accurate definitions; grouped and
 * filtered alphabetically in the Glossary section. `related` lists nearby terms
 * for cross-linking.
 */

import type { GlossaryTerm } from "./types";

export const GLOSSARY: ReadonlyArray<GlossaryTerm> = [
  { term: "Agent", definition: "An LLM-driven system that plans and takes actions — calling tools, browsing or writing code — to complete multi-step tasks.", related: ["Tool Use", "Reasoning"] },
  { term: "Attention", definition: "A mechanism that lets a model weigh the relevance of every token to every other when computing a representation.", related: ["Self-Attention", "Transformer"] },
  { term: "Backpropagation", definition: "The algorithm that computes gradients of the loss with respect to each weight by applying the chain rule backward through the network.", related: ["Gradient Descent"] },
  { term: "Beam Search", definition: "A decoding strategy that keeps the k most probable partial sequences at each step instead of greedily picking one.", related: ["Decoding", "Temperature"] },
  { term: "BERT", definition: "A bidirectional Transformer pre-trained with masked-language modelling; a milestone for language understanding.", related: ["Transformer", "Pre-training"] },
  { term: "Context Window", definition: "The maximum number of tokens a model can attend to at once, spanning the prompt and its generated output.", related: ["Token", "KV Cache"] },
  { term: "Diffusion Model", definition: "A generative model that creates data by learning to reverse a gradual noising process.", related: ["Generative Model", "CLIP"] },
  { term: "Embedding", definition: "A dense vector representation of an item where geometric closeness reflects semantic similarity.", related: ["Vector Database", "RAG"] },
  { term: "Epoch", definition: "One complete pass of the training algorithm over the entire training dataset.", related: ["Training", "Overfitting"] },
  { term: "Few-shot Learning", definition: "Performing a task from just a handful of examples provided in the prompt, with no weight updates.", related: ["In-context Learning", "Zero-shot"] },
  { term: "Fine-tuning", definition: "Continuing training of a pre-trained model on a smaller, task-specific dataset to specialise it.", related: ["LoRA", "Transfer Learning"] },
  { term: "GAN", abbr: "Generative Adversarial Network", definition: "A generative framework where a generator and discriminator compete, improving sample realism.", related: ["Generative Model"] },
  { term: "Gradient Descent", definition: "An optimisation method that iteratively moves parameters in the direction that most reduces the loss.", related: ["Backpropagation", "Learning Rate"] },
  { term: "Hallucination", definition: "When a model generates fluent but factually incorrect or unsupported content.", related: ["RAG", "Guardrails"] },
  { term: "Hyperparameter", definition: "A configuration value set before training (e.g. learning rate, batch size) rather than learned from data.", related: ["Training"] },
  { term: "In-context Learning", definition: "A model's ability to perform a task from instructions and examples in the prompt alone.", related: ["Few-shot Learning", "Prompt"] },
  { term: "Inference", definition: "Running a trained model to produce outputs, as opposed to training it.", related: ["KV Cache", "Quantization"] },
  { term: "KV Cache", definition: "Stored key/value vectors from previous tokens that make autoregressive generation far faster.", related: ["Attention", "Inference"] },
  { term: "LLM", abbr: "Large Language Model", definition: "A large Transformer trained on vast text to predict the next token, yielding broad language abilities.", related: ["Transformer", "Scaling Laws"] },
  { term: "LoRA", abbr: "Low-Rank Adaptation", definition: "A parameter-efficient fine-tuning method that learns small low-rank weight updates.", related: ["Fine-tuning"] },
  { term: "Mixture of Experts", abbr: "MoE", definition: "An architecture with many expert sub-networks where a router activates only a few per token.", related: ["Routing", "Sparsity"] },
  { term: "Multimodal", definition: "Models that process more than one modality — e.g. text, images, audio and video — together.", related: ["CLIP", "Diffusion Model"] },
  { term: "Overfitting", definition: "When a model memorises training data and fails to generalise to unseen examples.", related: ["Epoch", "Regularisation"] },
  { term: "Parameter", definition: "A learned weight inside a model; modern LLMs have billions to trillions of them.", related: ["LLM", "Scaling Laws"] },
  { term: "Pre-training", definition: "The initial, large-scale self-supervised training phase that gives a model general knowledge.", related: ["Fine-tuning", "BERT"] },
  { term: "Prompt", definition: "The input text (instructions, context, examples) given to a language model.", related: ["In-context Learning", "Few-shot Learning"] },
  { term: "Quantization", definition: "Storing model weights/activations in lower precision (e.g. 4-bit) to cut memory and speed up inference.", related: ["Inference", "Mixed Precision"] },
  { term: "RAG", abbr: "Retrieval-Augmented Generation", definition: "Augmenting a model's prompt with retrieved documents so answers are grounded in external data.", related: ["Embedding", "Hallucination"] },
  { term: "RLHF", abbr: "Reinforcement Learning from Human Feedback", definition: "Aligning a model to human preferences via a learned reward model and policy optimisation.", related: ["Alignment", "Reward Model"] },
  { term: "RoPE", abbr: "Rotary Positional Embedding", definition: "Encodes position by rotating query/key vectors, improving relative-position and long-context handling.", related: ["Positional Encoding", "Attention"] },
  { term: "Self-Attention", definition: "Attention applied within a single sequence, letting each token attend to the others.", related: ["Attention", "Transformer"] },
  { term: "Temperature", definition: "A sampling parameter that controls randomness — higher values give more diverse, lower more deterministic output.", related: ["Decoding", "Top-p Sampling"] },
  { term: "Token", definition: "The atomic unit a model processes — typically a subword piece rather than a whole word.", related: ["Tokenization", "Context Window"] },
  { term: "Tokenization", definition: "The process of splitting text into tokens (often via Byte-Pair Encoding) before a model can read it.", related: ["Token", "Embedding"] },
  { term: "Transformer", definition: "The attention-based architecture underpinning virtually all modern language models.", related: ["Attention", "LLM"] },
  { term: "Transfer Learning", definition: "Reusing knowledge from a model trained on one task to accelerate learning on another.", related: ["Fine-tuning", "Pre-training"] },
  { term: "Zero-shot", definition: "Performing a task with no examples — just an instruction in the prompt.", related: ["Few-shot Learning", "In-context Learning"] },
];
