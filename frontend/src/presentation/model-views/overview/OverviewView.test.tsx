import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OverviewView } from "./OverviewView";
import type { ModelInfo } from "../../../domain/modelInfo";
import type { Spec } from "../../../domain/spec";
import { useModelInfo } from "../../../application/useModelInfo";

vi.mock("../../../application/useModelInfo", () => ({
  useModelInfo: vi.fn(),
}));

const stubSpec: Spec = {
  model_id: "deepseek-ai/DeepSeek-V4-Flash",
  model_type: "deepseek_v4",
  config_summary: {},
  graph: [],
};

// The HF Hub `?blobs=true` response returns special tokens as `AddedToken`
// OBJECTS (not strings) — exactly what deepseek-ai/DeepSeek-V4-Flash ships.
const addedTokenInfo = {
  model_id: "deepseek-ai/DeepSeek-V4-Flash",
  tags: [],
  siblings: [],
  config: {
    architectures: ["DeepseekV4ForCausalLM"],
    model_type: "deepseek_v4",
    tokenizer_config: {
      bos_token: { __type: "AddedToken", content: "<｜begin▁of▁sentence｜>" },
      eos_token: { __type: "AddedToken", content: "<｜end▁of▁sentence｜>" },
      pad_token: { __type: "AddedToken", content: "<｜end▁of▁sentence｜>" },
    },
  },
} as unknown as ModelInfo;

afterEach(() => vi.clearAllMocks());

describe("OverviewView — tokenizer tokens as AddedToken objects", () => {
  it("renders the token content without crashing", () => {
    vi.mocked(useModelInfo).mockReturnValue({
      info: addedTokenInfo,
      readme: null,
      loading: false,
      error: null,
    });

    render(<OverviewView spec={stubSpec} />);

    // The BOS token's text content must appear; rendering the raw object would
    // throw "Objects are not valid as a React child".
    expect(screen.getByText("<｜begin▁of▁sentence｜>")).toBeInTheDocument();
  });
});
