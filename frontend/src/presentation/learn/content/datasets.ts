/**
 * Notable training datasets shown in the Datasets section. Sizes are
 * approximate, public figures; descriptions are accurate.
 */

import type { Dataset } from "./types";

export const DATASETS: ReadonlyArray<Dataset> = [
  {
    id: "common-crawl",
    name: "Common Crawl",
    modality: "Text (web)",
    size: "Petabytes",
    description: "A massive, regularly-refreshed crawl of the public web — the raw source behind most LLM text corpora.",
    usedBy: "Most large language models",
    tone: "blue",
  },
  {
    id: "fineweb",
    name: "FineWeb",
    modality: "Text (web)",
    size: "~15T tokens",
    description: "A heavily-filtered, deduplicated derivative of Common Crawl built for high-quality LLM pre-training.",
    usedBy: "Open LLM pre-training",
    tone: "green",
  },
  {
    id: "the-pile",
    name: "The Pile",
    modality: "Text (mixed)",
    size: "~825 GB",
    description: "A diverse corpus combining books, code, academic papers and web text for language-model training.",
    usedBy: "GPT-Neo, Pythia and others",
    tone: "purple",
  },
  {
    id: "c4",
    name: "C4",
    modality: "Text (web)",
    size: "~750 GB",
    description: "The Colossal Clean Crawled Corpus — a cleaned slice of Common Crawl introduced with the T5 model.",
    usedBy: "T5 and many others",
    tone: "teal",
  },
  {
    id: "imagenet",
    name: "ImageNet",
    modality: "Images",
    size: "~14M images",
    description: "Labelled images across thousands of categories; its annual challenge sparked the deep-learning era.",
    usedBy: "Vision models (AlexNet onward)",
    tone: "yellow",
  },
  {
    id: "laion-5b",
    name: "LAION-5B",
    modality: "Image–text pairs",
    size: "~5.8B pairs",
    description: "Billions of image–caption pairs scraped from the web — fuel for CLIP and text-to-image diffusion models.",
    usedBy: "Stable Diffusion, CLIP",
    tone: "red",
  },
  {
    id: "wikipedia",
    name: "Wikipedia",
    modality: "Text (encyclopedic)",
    size: "~Tens of GB",
    description: "High-quality encyclopedic text in many languages — a clean, factual staple of pre-training mixes.",
    usedBy: "Nearly every LLM",
    tone: "blue",
  },
];
