/**
 * Core AI / LLM concepts shown in the Concepts section. Each concept carries a
 * card blurb plus the detail-panel content (overview, key takeaways, how it
 * works, the relevant maths, and curated external resources). Authored to be
 * accurate and approachable; the featured "Attention" entry is the most
 * fleshed-out, mirroring the Concepts mock.
 */

import type { Concept } from "./types";

export const CONCEPTS: ReadonlyArray<Concept> = [
  {
    id: "attention",
    name: "Attention Mechanism",
    category: "Core Concept",
    level: "Beginner",
    readMinutes: 5,
    difficulty: 2,
    summary: "The mechanism that lets models focus on the most relevant parts of the input.",
    overview:
      "Attention lets a model dynamically focus on different parts of the input sequence when producing each part of the output. Instead of treating all tokens equally, the model learns which tokens are most important for the current prediction — and weighs them accordingly.",
    keyTakeaways: [
      "Allows models to focus on the most relevant information.",
      "Captures long-range dependencies that recurrence struggles with.",
      "Is the foundation of the Transformer architecture.",
    ],
    howItWorks: [
      "Each token is projected into a Query, a Key and a Value vector.",
      "A token's Query is compared (dot product) against every Key to score relevance.",
      "Scores are scaled and passed through softmax to become attention weights.",
      "The output is the weighted sum of all Value vectors.",
    ],
    math: [
      {
        label: "Scaled dot-product attention",
        formula: "Attention(Q, K, V) = softmax(QKᵀ / √dₖ) · V",
        note: "dₖ is the key dimension; the √dₖ scaling keeps gradients stable.",
      },
    ],
    related: ["Transformers", "Self-Attention", "Query, Key, Value", "Positional Encoding"],
    resources: [
      { title: "Attention Is All You Need (2017)", kind: "Research Paper", href: "https://arxiv.org/abs/1706.03762" },
      { title: "The Illustrated Transformer", kind: "Blog Article", href: "https://jalammar.github.io/illustrated-transformer/" },
      { title: "Attention Mechanism, Explained Visually", kind: "YouTube Video", href: "https://www.youtube.com/watch?v=eMlx5fFNoYc" },
    ],
  },
  {
    id: "transformers",
    name: "Transformers",
    category: "Architecture",
    level: "Beginner",
    readMinutes: 8,
    difficulty: 3,
    summary: "The architecture that revolutionised NLP and forms the foundation of LLMs.",
    overview:
      "The Transformer is a neural network architecture built entirely on attention, with no recurrence or convolution. By processing all tokens in parallel and letting every token attend to every other, it trains efficiently on modern hardware and scales to enormous sizes — making it the backbone of essentially every modern language model.",
    keyTakeaways: [
      "Replaces recurrence with self-attention for full parallelism.",
      "Stacks identical blocks of attention + feed-forward layers.",
      "Scales remarkably well with data, parameters and compute.",
    ],
    howItWorks: [
      "Tokens are embedded and given positional information.",
      "Each block applies multi-head self-attention, then a feed-forward network.",
      "Residual connections and layer normalisation stabilise deep stacks.",
      "Decoder-only variants mask the future to predict the next token.",
    ],
    math: [
      { label: "Multi-head attention", formula: "MultiHead(Q,K,V) = Concat(head₁ … headₕ) · Wᴼ" },
      { label: "Feed-forward block", formula: "FFN(x) = max(0, xW₁ + b₁)W₂ + b₂" },
    ],
    related: ["Attention", "Self-Attention", "Encoder–Decoder", "Residual Connections"],
    resources: [
      { title: "Attention Is All You Need (2017)", kind: "Research Paper", href: "https://arxiv.org/abs/1706.03762" },
      { title: "The Illustrated Transformer", kind: "Blog Article", href: "https://jalammar.github.io/illustrated-transformer/" },
    ],
  },
  {
    id: "embeddings",
    name: "Embeddings",
    category: "Core Concept",
    level: "Beginner",
    readMinutes: 6,
    difficulty: 2,
    summary: "Convert data into dense vectors so machines can understand meaning.",
    overview:
      "An embedding maps a discrete item — a word, token, image or user — to a dense vector of real numbers, positioned so that similar items sit close together in the space. Embeddings turn meaning into geometry, which is what lets models compare, search and reason over content.",
    keyTakeaways: [
      "Represent meaning as position in a continuous vector space.",
      "Similar items have nearby vectors (high cosine similarity).",
      "Power search, recommendation, clustering and RAG.",
    ],
    howItWorks: [
      "An embedding layer (a lookup table) maps each token id to a vector.",
      "Vectors are learned during training so related items cluster.",
      "Similarity is measured with dot product or cosine distance.",
    ],
    math: [
      { label: "Cosine similarity", formula: "cos(a, b) = (a · b) / (‖a‖ ‖b‖)" },
    ],
    related: ["Word Vectors", "Semantic Search", "RAG", "Vector Databases"],
    resources: [
      { title: "Efficient Estimation of Word Representations (word2vec)", kind: "Research Paper", href: "https://arxiv.org/abs/1301.3781" },
      { title: "The Illustrated Word2vec", kind: "Blog Article", href: "https://jalammar.github.io/illustrated-word2vec/" },
    ],
  },
  {
    id: "llm",
    name: "Large Language Models",
    category: "Model Type",
    level: "Beginner",
    readMinutes: 7,
    difficulty: 2,
    summary: "Models trained on massive text data to understand and generate language.",
    overview:
      "A Large Language Model is a Transformer trained on vast text corpora to predict the next token. At sufficient scale this simple objective yields broad capabilities — writing, translation, coding, reasoning — that emerge without being explicitly programmed.",
    keyTakeaways: [
      "Trained by predicting the next token over enormous corpora.",
      "Capabilities emerge with scale of data, parameters and compute.",
      "Adapted via prompting, fine-tuning or RLHF.",
    ],
    howItWorks: [
      "Pre-train on web-scale text with a next-token-prediction objective.",
      "Optionally fine-tune on instructions and align with human feedback.",
      "At inference, sample tokens autoregressively from the model's distribution.",
    ],
    math: [
      { label: "Language-modelling objective", formula: "L = −Σₜ log P(xₜ | x₁ … xₜ₋₁)" },
    ],
    related: ["Transformers", "Scaling Laws", "Pre-training", "In-context Learning"],
    resources: [
      { title: "Language Models are Few-Shot Learners (GPT-3)", kind: "Research Paper", href: "https://arxiv.org/abs/2005.14165" },
    ],
  },
  {
    id: "rlhf",
    name: "RLHF",
    category: "Training",
    level: "Intermediate",
    readMinutes: 6,
    difficulty: 3,
    summary: "Reinforcement Learning from Human Feedback aligns models with human preferences.",
    overview:
      "RLHF fine-tunes a language model to behave the way people prefer. Humans rank model outputs, a reward model is trained to predict those preferences, and the policy is then optimised against that reward — making models more helpful, honest and harmless.",
    keyTakeaways: [
      "Turns subjective human preferences into a trainable reward signal.",
      "The key technique behind helpful, aligned chat assistants.",
      "Often paired with a KL penalty to avoid drifting too far from the base model.",
    ],
    howItWorks: [
      "Collect human rankings of competing model responses.",
      "Train a reward model to predict which response humans prefer.",
      "Optimise the policy with PPO (or DPO) to maximise reward.",
    ],
    math: [
      { label: "RLHF objective", formula: "max E[r(x, y)] − β · KL(π‖π₀)", note: "Reward maximisation with a KL leash to the base policy π₀." },
    ],
    related: ["Alignment", "Reward Model", "PPO", "DPO"],
    resources: [
      { title: "Training language models to follow instructions (InstructGPT)", kind: "Research Paper", href: "https://arxiv.org/abs/2203.02155" },
    ],
  },
  {
    id: "moe",
    name: "Mixture of Experts (MoE)",
    category: "Architecture",
    level: "Intermediate",
    readMinutes: 7,
    difficulty: 4,
    summary: "Uses multiple expert networks and activates only a subset for efficiency.",
    overview:
      "A Mixture-of-Experts layer contains many parallel 'expert' feed-forward networks, but a lightweight router activates only a few per token. This decouples total parameter count from per-token compute — giving the capacity of a huge model at the cost of a much smaller one.",
    keyTakeaways: [
      "Scales parameters without scaling per-token compute.",
      "A router sends each token to its top-k experts.",
      "Powers efficient frontier models (Mixtral, and others).",
    ],
    howItWorks: [
      "A router scores each token against every expert.",
      "Only the top-k experts (often k = 2) run for that token.",
      "Outputs are combined, weighted by the router's gates.",
      "Load-balancing losses keep experts evenly used.",
    ],
    math: [
      { label: "Sparse gating", formula: "y = Σ_{i∈TopK} G(x)ᵢ · Eᵢ(x)", note: "G is the router gate; Eᵢ are the experts." },
    ],
    related: ["Sparsity", "Routing", "Scaling", "Feed-forward Network"],
    resources: [
      { title: "Outrageously Large Neural Networks (Sparse MoE)", kind: "Research Paper", href: "https://arxiv.org/abs/1701.06538" },
    ],
  },
  {
    id: "rope",
    name: "RoPE (Rotary Positional Embedding)",
    category: "Core Concept",
    level: "Intermediate",
    readMinutes: 5,
    difficulty: 4,
    summary: "A positional encoding technique that improves long-context understanding.",
    overview:
      "Rotary Positional Embedding encodes a token's position by rotating its query and key vectors by an angle proportional to the position. Because attention then depends only on relative position, RoPE generalises better to long contexts and is used by most modern LLMs (Llama, Qwen, Mistral).",
    keyTakeaways: [
      "Injects position by rotating Q/K vectors, not by adding a vector.",
      "Makes attention depend on relative distance between tokens.",
      "Extrapolates to longer sequences better than absolute encodings.",
    ],
    howItWorks: [
      "Pair up the dimensions of each Q/K vector.",
      "Rotate each pair by an angle that grows with token position.",
      "The dot product of two rotated vectors encodes their relative offset.",
    ],
    math: [
      { label: "Rotation by position", formula: "q̃ₘ = Rₘ q,  k̃ₙ = Rₙ k  ⇒  q̃ₘ · k̃ₙ depends on (m − n)" },
    ],
    related: ["Positional Encoding", "Attention", "Long Context"],
    resources: [
      { title: "RoFormer: Enhanced Transformer with RoPE", kind: "Research Paper", href: "https://arxiv.org/abs/2104.09864" },
    ],
  },
  {
    id: "kv-cache",
    name: "KV Cache",
    category: "Optimization",
    level: "Intermediate",
    readMinutes: 4,
    difficulty: 3,
    summary: "Stores key and value states to speed up autoregressive generation.",
    overview:
      "During generation a model produces one token at a time. The KV cache stores the Key and Value vectors already computed for previous tokens, so each new step only computes attention for the new token — turning generation from quadratic into linear work per step.",
    keyTakeaways: [
      "Avoids recomputing attention over the whole prefix each step.",
      "Trades memory for a large speed-up in decoding.",
      "Its size grows with sequence length — a key memory cost at long context.",
    ],
    howItWorks: [
      "On each step, compute K and V only for the new token.",
      "Append them to the cached K/V from previous steps.",
      "Attend the new Query over the full cached K/V.",
    ],
    math: [
      { label: "Cache memory", formula: "mem ≈ 2 · layers · heads · d_head · seq · batch · bytes" },
    ],
    related: ["Inference", "Attention", "Memory", "Throughput"],
    resources: [
      { title: "Efficient Memory Management for LLM Serving (PagedAttention)", kind: "Research Paper", href: "https://arxiv.org/abs/2309.06180" },
    ],
  },
  {
    id: "tokenization",
    name: "Tokenization",
    category: "Core Concept",
    level: "Beginner",
    readMinutes: 4,
    difficulty: 2,
    summary: "Breaks text into smaller units (tokens) that models can process.",
    overview:
      "Tokenization splits raw text into the units a model actually sees. Modern LLMs use subword schemes like Byte-Pair Encoding, which balance vocabulary size against sequence length and gracefully handle rare or unseen words by composing them from smaller pieces.",
    keyTakeaways: [
      "Models operate on token ids, not raw characters or words.",
      "Subword tokenisation handles rare words without huge vocabularies.",
      "Token count drives context limits and API cost.",
    ],
    howItWorks: [
      "Start from bytes/characters and a target vocabulary size.",
      "Repeatedly merge the most frequent adjacent pair (BPE).",
      "Map text to ids using the learned merge rules at runtime.",
    ],
    math: [
      { label: "Rough English estimate", formula: "1 token ≈ 4 characters ≈ ¾ of a word" },
    ],
    related: ["Byte-Pair Encoding", "Vocabulary", "Embeddings", "Context Window"],
    resources: [
      { title: "Neural Machine Translation of Rare Words with Subword Units (BPE)", kind: "Research Paper", href: "https://arxiv.org/abs/1508.07909" },
    ],
  },
  {
    id: "beam-search",
    name: "Beam Search",
    category: "Decoding",
    level: "Intermediate",
    readMinutes: 5,
    difficulty: 3,
    summary: "A search algorithm used to generate higher-quality sequences.",
    overview:
      "Beam search is a decoding strategy that keeps the k most probable partial sequences ('beams') at each step instead of greedily committing to one. It explores more of the output space, often yielding more fluent results for tasks like translation and summarisation.",
    keyTakeaways: [
      "Keeps the top-k candidate sequences alive at each step.",
      "Balances output quality against compute (larger k = more search).",
      "Sampling methods (top-p, temperature) are common alternatives for open-ended text.",
    ],
    howItWorks: [
      "At each step, expand every beam by all possible next tokens.",
      "Score the expansions by cumulative log-probability.",
      "Keep only the top-k highest-scoring sequences.",
    ],
    math: [
      { label: "Sequence score", formula: "score(y) = Σₜ log P(yₜ | y₁ … yₜ₋₁)" },
    ],
    related: ["Decoding", "Greedy Search", "Top-p Sampling", "Temperature"],
    resources: [
      { title: "The Curious Case of Neural Text Degeneration", kind: "Research Paper", href: "https://arxiv.org/abs/1904.09751" },
    ],
  },
  {
    id: "quantization",
    name: "Quantization",
    category: "Optimization",
    level: "Advanced",
    readMinutes: 6,
    difficulty: 4,
    summary: "Reduces model precision to improve inference speed and reduce memory.",
    overview:
      "Quantization stores model weights (and sometimes activations) in lower precision — 8-bit or 4-bit instead of 16-bit — shrinking memory and speeding up inference. Done well, it lets large models run on commodity GPUs or even laptops with minimal quality loss.",
    keyTakeaways: [
      "Cuts memory footprint several-fold (e.g. 4-bit ≈ ¼ of fp16).",
      "Enables large models to run on modest hardware.",
      "Careful schemes (GPTQ, AWQ) keep accuracy loss small.",
    ],
    howItWorks: [
      "Map a range of float values onto a small set of integers.",
      "Store a scale (and zero-point) to dequantize during compute.",
      "Calibrate on sample data to minimise error on important weights.",
    ],
    math: [
      { label: "Affine quantization", formula: "q = round(x / s) + z,   x ≈ s · (q − z)" },
    ],
    related: ["Inference", "Memory", "GPTQ", "Mixed Precision"],
    resources: [
      { title: "GPTQ: Accurate Post-Training Quantization", kind: "Research Paper", href: "https://arxiv.org/abs/2210.17323" },
    ],
  },
  {
    id: "guardrails",
    name: "Guardrails",
    category: "Alignment",
    level: "Intermediate",
    readMinutes: 6,
    difficulty: 3,
    summary: "Techniques to ensure AI outputs are safe, reliable and aligned.",
    overview:
      "Guardrails are the layers that keep a deployed model's behaviour within safe and useful bounds — from training-time alignment to runtime input/output filtering, structured-output validation and policy checks. They reduce harmful, off-topic or malformed responses.",
    keyTakeaways: [
      "Span training-time alignment and runtime checks.",
      "Validate, filter or constrain inputs and outputs.",
      "Essential for trustworthy production deployments.",
    ],
    howItWorks: [
      "Filter or classify inputs for policy violations before the model runs.",
      "Constrain generation (schemas, allowed tools, refusals).",
      "Validate and moderate outputs before returning them to users.",
    ],
    math: [],
    related: ["Alignment", "Safety", "Content Moderation", "Structured Output"],
    resources: [
      { title: "Constitutional AI: Harmlessness from AI Feedback", kind: "Research Paper", href: "https://arxiv.org/abs/2212.08073" },
    ],
  },
  {
    id: "fine-tuning",
    name: "Fine-tuning",
    category: "Training",
    level: "Intermediate",
    readMinutes: 6,
    difficulty: 3,
    summary: "Adapts a pre-trained model to a specific task or domain.",
    overview:
      "Fine-tuning continues training a pre-trained model on a smaller, targeted dataset so it specialises for a task, domain or style. Parameter-efficient methods like LoRA update only a tiny fraction of weights, making adaptation cheap and shareable.",
    keyTakeaways: [
      "Reuses general pre-trained knowledge for a specific task.",
      "LoRA / adapters make it cheap by training few extra parameters.",
      "Needs far less data and compute than training from scratch.",
    ],
    howItWorks: [
      "Start from pre-trained weights.",
      "Train on a curated, task-specific dataset at a low learning rate.",
      "Optionally freeze the base and learn small low-rank adapters (LoRA).",
    ],
    math: [
      { label: "LoRA update", formula: "W' = W + BA", note: "B and A are low-rank; only they are trained." },
    ],
    related: ["Transfer Learning", "LoRA", "Pre-training", "Adapters"],
    resources: [
      { title: "LoRA: Low-Rank Adaptation of Large Language Models", kind: "Research Paper", href: "https://arxiv.org/abs/2106.09685" },
    ],
  },
  {
    id: "backpropagation",
    name: "Backpropagation",
    category: "Training",
    level: "Intermediate",
    readMinutes: 6,
    difficulty: 3,
    summary: "The algorithm that trains neural networks by propagating error gradients.",
    overview:
      "Backpropagation efficiently computes how much each weight contributed to the error by applying the chain rule backward through the network. Paired with gradient descent, it is the learning engine behind virtually every neural network.",
    keyTakeaways: [
      "Computes gradients of the loss w.r.t. every parameter efficiently.",
      "Uses the chain rule, layer by layer, from output to input.",
      "Makes training deep networks computationally feasible.",
    ],
    howItWorks: [
      "Run a forward pass and compute the loss.",
      "Propagate the gradient backward through each layer (chain rule).",
      "Update weights in the negative-gradient direction.",
    ],
    math: [
      { label: "Gradient-descent update", formula: "θ ← θ − η · ∇θ L" },
    ],
    related: ["Gradient Descent", "Neural Networks", "Autodiff", "Loss Function"],
    resources: [
      { title: "Learning representations by back-propagating errors (1986)", kind: "Research Paper", href: "https://www.nature.com/articles/323533a0" },
    ],
  },
  {
    id: "cnn",
    name: "Convolutional Neural Networks",
    category: "Architecture",
    level: "Intermediate",
    readMinutes: 6,
    difficulty: 3,
    summary: "Grid-aware networks that powered the computer-vision revolution.",
    overview:
      "CNNs apply small learnable filters that slide across an image, detecting local patterns like edges and textures and composing them into higher-level features. Weight sharing and locality make them efficient and translation-aware — the architecture behind the 2012 vision breakthrough.",
    keyTakeaways: [
      "Convolutions share weights and exploit spatial locality.",
      "Stacks build from edges → textures → objects.",
      "Dominated computer vision before Vision Transformers.",
    ],
    howItWorks: [
      "Slide learnable filters over the input to produce feature maps.",
      "Apply non-linearities and pooling to downsample.",
      "Stack layers so receptive fields grow with depth.",
    ],
    math: [
      { label: "Discrete convolution", formula: "(f ∗ g)(i,j) = ΣₘΣₙ f(m,n) · g(i−m, j−n)" },
    ],
    related: ["Computer Vision", "AlexNet", "Pooling", "Feature Maps"],
    resources: [
      { title: "ImageNet Classification with Deep CNNs (AlexNet)", kind: "Research Paper", href: "https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks" },
    ],
  },
  {
    id: "diffusion",
    name: "Diffusion Models",
    category: "Model Type",
    level: "Advanced",
    readMinutes: 7,
    difficulty: 4,
    summary: "Generate images by learning to reverse a gradual noising process.",
    overview:
      "Diffusion models learn to generate data by reversing a process that gradually adds noise. Starting from pure noise, the model denoises step by step toward a coherent sample — the technique behind DALL·E 2, Stable Diffusion and Midjourney.",
    keyTakeaways: [
      "Train by adding noise, then learn to remove it.",
      "Generate by denoising from random noise, step by step.",
      "Overtook GANs as the leading image-generation method.",
    ],
    howItWorks: [
      "Forward process: progressively corrupt data with Gaussian noise.",
      "Train a network to predict the noise at each step.",
      "Sample by iteratively denoising from random noise, often text-conditioned.",
    ],
    math: [
      { label: "Forward noising step", formula: "xₜ = √(ᾱₜ) · x₀ + √(1 − ᾱₜ) · ε,   ε ~ N(0, I)" },
    ],
    related: ["Generative Models", "CLIP", "Text-to-Image", "U-Net"],
    resources: [
      { title: "Denoising Diffusion Probabilistic Models", kind: "Research Paper", href: "https://arxiv.org/abs/2006.11239" },
    ],
  },
];
