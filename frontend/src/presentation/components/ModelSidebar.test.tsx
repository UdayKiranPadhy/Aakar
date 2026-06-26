import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ModelSidebar } from "./ModelSidebar";
import { useArchStore } from "../../store/archStore";
import { modelViewRegistry } from "../model-views/ModelViewRegistry";
// Populate the registry with the real view metadata (overview/research are
// card-first; the rest need the spec) so the assertions track the shipped config.
import "../model-views/register";

const stubSpec = {
  model_id: "meta-llama/Llama-3.1-8B",
  model_type: "llama",
  config_summary: {},
  graph: [],
} as const;

/** Map each nav tab's label → its <button>, read from the rendered rail. */
function tabsByLabel() {
  const nav = screen.getByRole("navigation", { name: "Model views" });
  const buttons = [...nav.querySelectorAll("button")];
  return new Map(buttons.map((b) => [b.querySelector("span")?.textContent?.trim(), b]));
}

describe("ModelSidebar loading state", () => {
  it("renders the rail while the architecture call is still in flight", () => {
    useArchStore.setState({ loading: true, spec: null, requestedModelId: stubSpec.model_id });
    render(<ModelSidebar />);
    // Every registered view has its tab, even before the spec lands.
    const tabs = tabsByLabel();
    for (const meta of modelViewRegistry.list()) {
      expect(tabs.get(meta.label)).toBeTruthy();
    }
  });

  it("spins only the spec-dependent tabs while loading; card-first tabs stay idle", () => {
    useArchStore.setState({ loading: true, spec: null, requestedModelId: stubSpec.model_id });
    render(<ModelSidebar />);

    const tabs = tabsByLabel();
    for (const meta of modelViewRegistry.list()) {
      const tab = tabs.get(meta.label)!;
      const spinner = tab.querySelector('[role="status"]');
      if (meta.needsSpec) {
        expect(tab).toHaveAttribute("aria-busy", "true");
        expect(spinner).not.toBeNull();
      } else {
        expect(tab).not.toHaveAttribute("aria-busy");
        expect(spinner).toBeNull();
      }
    }
  });

  it("clears every spinner once the spec has loaded", () => {
    useArchStore.setState({ loading: false, spec: stubSpec });
    render(<ModelSidebar />);
    const nav = screen.getByRole("navigation", { name: "Model views" });
    expect(nav.querySelectorAll('[role="status"]').length).toBe(0);
  });

  it("spins the active card-first tab while its own fetch is in flight", () => {
    // Architecture call is done (loading: false), but the open card-first view's
    // own fetch is still running (cardLoading: true).
    useArchStore.setState({
      loading: false,
      spec: stubSpec,
      modelView: "overview",
      cardLoading: true,
    });
    render(<ModelSidebar />);
    const tabs = tabsByLabel();

    // The active card-first tab spins…
    expect(tabs.get("Overview")).toHaveAttribute("aria-busy", "true");
    expect(tabs.get("Overview")!.querySelector('[role="status"]')).not.toBeNull();
    // …the other card-first tab does not (it isn't mounted, so nothing is fetching)…
    expect(tabs.get("Research")).not.toHaveAttribute("aria-busy");
    expect(tabs.get("Research")!.querySelector('[role="status"]')).toBeNull();
    // …and the spec-dependent tabs are idle now the architecture call has resolved.
    expect(tabs.get("Architecture")!.querySelector('[role="status"]')).toBeNull();
  });
});
