import { describe, expect, it } from "vitest";

import { useArchStore } from "./archStore";
import type { Spec } from "../domain/spec";

const fakeSpec: Spec = {
  model_id: "gpt2",
  model_type: "gpt2",
  config_summary: { hidden_size: 768 },
  graph: [
    { id: "embed", type: "token_embedding", label: "Token embedding", params: {} },
    { id: "block_1", type: "decoder_block", label: "Block 1", params: {} },
  ],
};

describe("archStore", () => {
  describe("setModelInput", () => {
    it("updates the model input string", () => {
      useArchStore.getState().setModelInput("gpt2");
      expect(useArchStore.getState().modelInput).toBe("gpt2");
    });
  });

  describe("setSpec", () => {
    it("stores the spec and clears loading + error", () => {
      useArchStore.setState({
        loading: true,
        error: { kind: "unknown", title: "Oops", detail: "previous error" },
      });
      useArchStore.getState().setSpec(fakeSpec);
      const s = useArchStore.getState();
      expect(s.spec).toBe(fakeSpec);
      expect(s.loading).toBe(false);
      expect(s.error).toBeNull();
    });
  });

  describe("setLoading / setError", () => {
    it("setLoading toggles the loading flag", () => {
      useArchStore.getState().setLoading(true);
      expect(useArchStore.getState().loading).toBe(true);
    });

    it("setError stores the structured error and stops loading", () => {
      useArchStore.setState({ loading: true });
      useArchStore.getState().setError({
        kind: "unsupported",
        title: "Unsupported architecture",
        detail: "oops",
      });
      const s = useArchStore.getState();
      expect(s.error?.detail).toBe("oops");
      expect(s.error?.kind).toBe("unsupported");
      expect(s.loading).toBe(false);
    });
  });

  describe("selectNode", () => {
    it("prepends the expansionPath so selectionPath is a full root-to-node path", () => {
      useArchStore.setState({ expansionPath: ["block_1", "block_1.attn"] });
      useArchStore.getState().selectNode("block_1.attn.q");
      expect(useArchStore.getState().selectionPath).toEqual([
        "block_1",
        "block_1.attn",
        "block_1.attn.q",
      ]);
    });

    it("opens the detail panel", () => {
      useArchStore.getState().selectNode("embed");
      expect(useArchStore.getState().detailOpen).toBe(true);
    });

    it("un-collapses the detail rail so the selection is visible", () => {
      useArchStore.setState({ detailCollapsed: true });
      useArchStore.getState().selectNode("embed");
      expect(useArchStore.getState().detailCollapsed).toBe(false);
    });
  });

  describe("expandNode", () => {
    it("pushes the id onto expansionPath", () => {
      useArchStore.getState().expandNode("block_1");
      expect(useArchStore.getState().expansionPath).toEqual(["block_1"]);
    });

    it("CLOSES the detail panel on expand and clears the selection", () => {
      // Regression — earlier the panel was kept open with the parent's
      // details when drilling in, which dragged stale info into the next
      // view. The "previous block" context card is the new way to show
      // where you came from; the side panel resets.
      useArchStore.setState({
        selectionPath: ["embed"],
        detailOpen: true,
      });
      useArchStore.getState().expandNode("block_1");
      const s = useArchStore.getState();
      expect(s.selectionPath).toEqual([]);
      expect(s.detailOpen).toBe(false);
    });

    it("updates the level (capped at 3)", () => {
      useArchStore.getState().expandNode("block_1");
      expect(useArchStore.getState().level).toBe(2);
      useArchStore.getState().expandNode("block_1.attn");
      expect(useArchStore.getState().level).toBe(3);
      useArchStore.getState().expandNode("block_1.attn.sdpa");
      expect(useArchStore.getState().level).toBe(3);
    });
  });

  describe("collapseToLevel", () => {
    it("truncates expansionPath to the target level - 1", () => {
      useArchStore.setState({
        expansionPath: ["block_1", "block_1.attn", "block_1.attn.sdpa"],
      });
      useArchStore.getState().collapseToLevel(2);
      expect(useArchStore.getState().expansionPath).toEqual(["block_1"]);
    });

    it("collapsing to level 1 empties the expansion path and closes the panel", () => {
      useArchStore.setState({
        expansionPath: ["block_1"],
        selectionPath: ["block_1"],
        detailOpen: true,
      });
      useArchStore.getState().collapseToLevel(1);
      const s = useArchStore.getState();
      expect(s.expansionPath).toEqual([]);
      expect(s.selectionPath).toEqual([]);
      expect(s.detailOpen).toBe(false);
    });

    it("closes the panel and clears selection regardless of target level", () => {
      useArchStore.setState({
        expansionPath: ["block_1", "block_1.attn"],
        selectionPath: ["block_1", "block_1.attn", "block_1.attn.q"],
        detailOpen: true,
      });
      useArchStore.getState().collapseToLevel(2);
      const s = useArchStore.getState();
      expect(s.detailOpen).toBe(false);
      expect(s.selectionPath).toEqual([]);
      expect(s.expansionPath).toEqual(["block_1"]);
    });
  });

  describe("goToExpansion", () => {
    it("replaces the expansion path wholesale", () => {
      useArchStore.setState({ expansionPath: ["block_5"] });
      useArchStore.getState().goToExpansion(["block_1"]);
      expect(useArchStore.getState().expansionPath).toEqual(["block_1"]);
    });

    it("updates level based on the new path depth", () => {
      useArchStore.getState().goToExpansion(["a", "b", "c"]);
      expect(useArchStore.getState().level).toBe(3); // capped
      useArchStore.getState().goToExpansion(["a"]);
      expect(useArchStore.getState().level).toBe(2);
      useArchStore.getState().goToExpansion([]);
      expect(useArchStore.getState().level).toBe(1);
    });

    it("clears selection and closes the panel (consistent with expandNode)", () => {
      useArchStore.setState({
        selectionPath: ["foo"],
        detailOpen: true,
      });
      useArchStore.getState().goToExpansion(["block_1"]);
      const s = useArchStore.getState();
      expect(s.selectionPath).toEqual([]);
      expect(s.detailOpen).toBe(false);
    });

    it("stores a copy of the path (doesn't keep the caller's reference)", () => {
      const path = ["block_1"];
      useArchStore.getState().goToExpansion(path);
      path.push("block_1.attn"); // mutate the caller's array
      expect(useArchStore.getState().expansionPath).toEqual(["block_1"]);
    });
  });

  describe("closeDetail / setAppMode / setModelView / toggleSidebar", () => {
    it("closeDetail just flips detailOpen to false", () => {
      useArchStore.setState({ detailOpen: true });
      useArchStore.getState().closeDetail();
      expect(useArchStore.getState().detailOpen).toBe(false);
    });

    it("setAppMode switches the top-level mode", () => {
      useArchStore.getState().setAppMode("model");
      expect(useArchStore.getState().appMode).toBe("model");
      useArchStore.getState().setAppMode("home");
      expect(useArchStore.getState().appMode).toBe("home");
    });

    it("setModelView switches the active sidebar view", () => {
      useArchStore.getState().setModelView("config");
      expect(useArchStore.getState().modelView).toBe("config");
    });

    it("toggleSidebar flips collapse, or sets it explicitly", () => {
      useArchStore.setState({ sidebarCollapsed: false });
      useArchStore.getState().toggleSidebar();
      expect(useArchStore.getState().sidebarCollapsed).toBe(true);
      useArchStore.getState().toggleSidebar(false);
      expect(useArchStore.getState().sidebarCollapsed).toBe(false);
    });

    it("setSidebarWidth / setDetailWidth store the rail widths", () => {
      useArchStore.getState().setSidebarWidth(320);
      expect(useArchStore.getState().sidebarWidth).toBe(320);
      useArchStore.getState().setDetailWidth(420);
      expect(useArchStore.getState().detailWidth).toBe(420);
    });

    it("toggleDetail flips the detail rail collapse, or sets it explicitly", () => {
      useArchStore.setState({ detailCollapsed: false });
      useArchStore.getState().toggleDetail();
      expect(useArchStore.getState().detailCollapsed).toBe(true);
      useArchStore.getState().toggleDetail(false);
      expect(useArchStore.getState().detailCollapsed).toBe(false);
    });

    it("setCompareSpec stores and clears the second spec", () => {
      useArchStore.getState().setCompareSpec(fakeSpec);
      expect(useArchStore.getState().compareSpec).toBe(fakeSpec);
      useArchStore.getState().setCompareSpec(null);
      expect(useArchStore.getState().compareSpec).toBeNull();
    });
  });

  describe("reset", () => {
    it("clears spec / paths, preserves modelInput + appMode, resets modelView to Overview", () => {
      useArchStore.setState({
        modelInput: "gpt2",
        spec: fakeSpec,
        compareSpec: fakeSpec,
        expansionPath: ["block_1"],
        selectionPath: ["block_1"],
        level: 2,
        detailOpen: true,
        appMode: "model",
        modelView: "config",
        loading: true,
        error: { kind: "unknown", title: "Stale", detail: "stale" },
      });
      useArchStore.getState().reset();
      const s = useArchStore.getState();
      expect(s.modelInput).toBe("gpt2"); // preserved
      expect(s.appMode).toBe("model"); // preserved
      expect(s.modelView).toBe("overview"); // every search lands on Overview
      expect(s.spec).toBeNull();
      expect(s.compareSpec).toBeNull();
      expect(s.expansionPath).toEqual([]);
      expect(s.selectionPath).toEqual([]);
      expect(s.level).toBe(1);
      expect(s.detailOpen).toBe(false);
      expect(s.loading).toBe(false);
      expect(s.error).toBeNull();
    });
  });
});
