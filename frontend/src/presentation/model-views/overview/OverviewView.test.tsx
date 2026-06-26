import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OverviewView } from "./OverviewView";
import type { ModelInfo } from "../../../domain/modelInfo";
import type { Spec } from "../../../domain/spec";
import { useModelInfo } from "../../../application/useModelInfo";

vi.mock("../../../application/useModelInfo", () => ({
  useModelInfo: vi.fn(),
}));

vi.mock("../../../store/archStore", () => ({
  useArchStore: (selector: (s: unknown) => unknown) =>
    selector({ setModelView: vi.fn(), setAppMode: vi.fn(), setCardLoading: vi.fn() }),
}));

const stubSpec: Spec = {
  model_id: "deepseek-ai/DeepSeek-V4-Flash",
  model_type: "deepseek_v4",
  config_summary: {},
  graph: [],
};

// The HF Hub `?blobs=true` response returns special tokens as `AddedToken`
// OBJECTS (not strings) — exactly what deepseek-ai/DeepSeek-V4-Flash ships.
// The dashboard must render around them without ever passing an object to a
// React child (which throws "Objects are not valid as a React child").
const addedTokenInfo = {
  model_id: "deepseek-ai/DeepSeek-V4-Flash",
  library_name: "transformers",
  tags: ["license:mit"],
  siblings: [{ rfilename: "config.json", size: 1234 }],
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

describe("OverviewView", () => {
  function mockInfo(info: ModelInfo | null, readme: string | null = null) {
    vi.mocked(useModelInfo).mockReturnValue({ info, readme, loading: false, error: null });
  }

  it("renders the model dashboard for a realistic payload with object-valued tokens", () => {
    mockInfo(addedTokenInfo);

    render(<OverviewView spec={stubSpec} />);

    // Title + key Model Details fields come straight from the Hub config.
    expect(
      screen.getByRole("heading", { level: 1, name: "deepseek-ai/DeepSeek-V4-Flash" }),
    ).toBeInTheDocument();
    expect(screen.getByText("DeepseekV4ForCausalLM")).toBeInTheDocument();
    expect(screen.getByText("deepseek_v4")).toBeInTheDocument();
  });

  it("derives the license from a `license:` tag when no top-level license is set", () => {
    mockInfo(addedTokenInfo);
    render(<OverviewView spec={stubSpec} />);
    // Surfaces in both the header badge row and the Model Details list.
    expect(screen.getAllByText("MIT").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the loading and empty states", () => {
    vi.mocked(useModelInfo).mockReturnValue({ info: null, readme: null, loading: true, error: null });
    const { rerender } = render(<OverviewView spec={stubSpec} />);
    expect(screen.getByText("Loading model card…")).toBeInTheDocument();

    vi.mocked(useModelInfo).mockReturnValue({ info: null, readme: null, loading: false, error: null });
    rerender(<OverviewView spec={stubSpec} />);
    expect(screen.getByText("No model information available.")).toBeInTheDocument();
  });
});
