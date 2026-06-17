import { describe, expect, it } from "vitest";

import { classifyFiles, fileBucket, fileRank, fileType } from "./fileClassify";

describe("fileType", () => {
  it("labels common model files by extension", () => {
    expect(fileType("model-00001-of-00002.safetensors")).toBe("Safetensors");
    expect(fileType("model.safetensors.index.json")).toBe("Index");
    expect(fileType("config.json")).toBe("JSON");
    expect(fileType("README.md")).toBe("Markdown");
    expect(fileType("tokenizer.model")).toBe("Tokenizer");
  });
});

describe("fileRank", () => {
  it("floats readme/config above weight shards", () => {
    expect(fileRank("README.md")).toBeLessThan(fileRank("config.json"));
    expect(fileRank("config.json")).toBeLessThan(fileRank("model-00001.safetensors"));
  });
});

describe("fileBucket", () => {
  it("buckets weights / config / tokenizer / docs / other", () => {
    expect(fileBucket("model.safetensors")).toBe("weights");
    expect(fileBucket("model.safetensors.index.json")).toBe("config");
    expect(fileBucket("config.json")).toBe("config");
    expect(fileBucket("tokenizer.json")).toBe("tokenizer");
    expect(fileBucket("vocab.json")).toBe("tokenizer");
    expect(fileBucket("README.md")).toBe("docs");
    expect(fileBucket("something.xyz")).toBe("other");
  });
});

describe("classifyFiles", () => {
  it("groups files, sums sizes only over sized files, and counts all", () => {
    const out = classifyFiles([
      { rfilename: "model-1.safetensors", size: 1000 },
      { rfilename: "model-2.safetensors" }, // no size
      { rfilename: "config.json", size: 100 },
      { rfilename: "tokenizer.json", size: 50 },
      { rfilename: "README.md", size: 10 },
    ]);
    const weights = out.find((b) => b.bucket === "weights")!;
    expect(weights.count).toBe(2);
    expect(weights.bytes).toBe(1000); // the size-less shard is counted but not summed
    expect(out.map((b) => b.bucket)).toEqual(["weights", "config", "tokenizer", "docs"]);
  });
  it("returns an empty array for no siblings", () => {
    expect(classifyFiles([])).toEqual([]);
  });
});
