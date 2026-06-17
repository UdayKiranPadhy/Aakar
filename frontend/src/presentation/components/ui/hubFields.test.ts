import { describe, expect, it } from "vitest";

import type { ModelInfo } from "../../../domain/modelInfo";
import {
  deriveLicense,
  deriveModality,
  deriveTopicTags,
  extractReadmeSummary,
  prettyWords,
  tokenText,
} from "./hubFields";

function info(partial: Partial<ModelInfo>): ModelInfo {
  return { model_id: "owner/model", tags: [], siblings: [], ...partial } as ModelInfo;
}

describe("deriveLicense", () => {
  it("prefers the top-level license field", () => {
    expect(deriveLicense(info({ license: "apache-2.0", tags: ["license:mit"] }))).toBe("Apache-2.0");
  });
  it("falls back to a license: tag", () => {
    expect(deriveLicense(info({ tags: ["license:mit"] }))).toBe("MIT");
  });
  it("falls back to card_data.license", () => {
    expect(deriveLicense(info({ card_data: { license: "mit" } }))).toBe("MIT");
  });
  it("returns null when no license is present", () => {
    expect(deriveLicense(info({}))).toBeNull();
  });
  it("title-cases unknown license ids", () => {
    expect(deriveLicense(info({ license: "custom-research-only" }))).toBe("Custom-Research-Only");
  });
});

describe("deriveModality", () => {
  it("returns null without a pipeline tag", () => {
    expect(deriveModality(undefined)).toBeNull();
  });
  it("detects multimodal when image + text are present", () => {
    expect(deriveModality("image-text-to-text")).toBe("Multimodal");
  });
  it("detects vision-only and audio-only pipelines", () => {
    expect(deriveModality("image-classification")).toBe("Vision");
    expect(deriveModality("automatic-speech-recognition")).toBe("Audio");
  });
  it("returns null for plain text pipelines (never asserts a modality)", () => {
    expect(deriveModality("text-generation")).toBeNull();
  });
});

describe("prettyWords", () => {
  it("title-cases hyphen/underscore separated words", () => {
    expect(prettyWords("long-context")).toBe("Long Context");
    expect(prettyWords("text_generation")).toBe("Text Generation");
  });
});

describe("deriveTopicTags", () => {
  it("drops plumbing tags / prefixes and keeps meaningful topics", () => {
    const tags = deriveTopicTags(
      info({
        tags: ["safetensors", "pytorch", "license:mit", "arxiv:1234.5678", "code", "conversational", "text-generation"],
        pipeline_tag: "text-generation",
      }),
    );
    expect(tags).toContain("Code");
    expect(tags).toContain("Conversational");
    expect(tags).not.toContain("Safetensors");
    expect(tags).not.toContain("Text Generation"); // equals the pipeline tag
  });
});

describe("extractReadmeSummary", () => {
  it("returns nulls for empty input", () => {
    expect(extractReadmeSummary(null)).toEqual({ lead: null, body: null });
  });
  it("strips YAML frontmatter and returns the first two prose paragraphs", () => {
    const md = [
      "---",
      "license: mit",
      "---",
      "",
      "# Title",
      "",
      "This model is a fast transformer for chat.",
      "",
      "It was trained on lots of data.",
    ].join("\n");
    const out = extractReadmeSummary(md);
    expect(out.lead).toContain("fast transformer");
    expect(out.body).toContain("trained on lots of data");
  });
  it("skips badges and headings before the first prose line", () => {
    const md = ["![badge](http://x/y.svg)", "# Heading", "", "Real prose here describing the model."].join("\n");
    expect(extractReadmeSummary(md).lead).toContain("Real prose here");
  });
});

describe("tokenText", () => {
  it("passes through plain strings", () => {
    expect(tokenText("<s>")).toBe("<s>");
  });
  it("unwraps AddedToken objects to their content", () => {
    expect(tokenText({ content: "<｜begin▁of▁sentence｜>" })).toBe("<｜begin▁of▁sentence｜>");
  });
  it("returns null for null / empty / contentless inputs (never an object)", () => {
    expect(tokenText(null)).toBeNull();
    expect(tokenText("")).toBeNull();
    expect(tokenText(undefined)).toBeNull();
    expect(tokenText({})).toBeNull();
  });
});
