import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DetailFilter, filterEntries } from "./DetailFilter";
import { GenericDetailPanel } from "./GenericDetailPanel";
import { useArchStore } from "../../store/archStore";
import type { Node, Spec } from "../../domain/spec";

useArchStore.setState({ spec: { config_summary: {} } as unknown as Spec });

describe("filterEntries", () => {
  it("returns all entries for an empty query", () => {
    expect(filterEntries([["a", 1], ["b", 2]], "")).toEqual([["a", 1], ["b", 2]]);
  });

  it("keeps only key-substring matches, case-insensitively", () => {
    expect(filterEntries([["alpha", 1], ["beta", 2]], "AL")).toEqual([["alpha", 1]]);
  });
});

describe("DetailFilter", () => {
  it("emits typed input", async () => {
    const seen: string[] = [];
    render(<DetailFilter value="" onChange={(v) => seen.push(v)} />);
    await userEvent.type(screen.getByLabelText("Filter detail fields"), "x");
    expect(seen).toContain("x");
  });
});

function bigNode(): Node {
  const params: Record<string, number> = { special_key: 1 };
  for (let i = 0; i < 13; i++) params[`field_${i}`] = i;
  return { id: "n", type: "big_module", label: "Big", params };
}

describe("GenericDetailPanel filtering", () => {
  it("shows a filter box only for large nodes and narrows the config list", async () => {
    const user = userEvent.setup();
    render(<GenericDetailPanel node={bigNode()} />);

    const filter = screen.getByLabelText("Filter detail fields");
    await user.type(filter, "special");
    expect(screen.getByText("special_key")).toBeInTheDocument();
    expect(screen.queryByText("field_0")).toBeNull();
  });

  it("omits the filter box for small nodes", () => {
    const small: Node = { id: "s", type: "small", label: "Small", params: { a: 1, b: 2 } };
    render(<GenericDetailPanel node={small} />);
    expect(screen.queryByLabelText("Filter detail fields")).toBeNull();
  });
});
