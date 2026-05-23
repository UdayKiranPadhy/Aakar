import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactFlowProvider } from "@xyflow/react";
import { describe, expect, it } from "vitest";

import { ContextBlockFlowNode, type ContextDirection } from "./ContextBlockNode";
import { useArchStore } from "../../store/archStore";
import type { Node } from "../../domain/spec";

const sibling: Node = {
  id: "block_1",
  type: "decoder_block",
  label: "Transformer block 1",
  meta: "masked attention + FFN",
  params: {},
  has_internals: true,
};

function renderNode(direction: ContextDirection) {
  const data = {
    specNode: sibling,
    contextPath: ["block_1"],
    direction,
  };
  return render(
    // ReactFlowProvider supplies the store context the Handle components need.
    <ReactFlowProvider>
      <ContextBlockFlowNode
        id={`__context_${direction}__block_1`}
        data={data as unknown as Record<string, unknown>}
        type="context"
        position={{ x: 0, y: 0 }}
        positionAbsoluteX={0}
        positionAbsoluteY={0}
        zIndex={0}
        dragging={false}
        selectable={false}
        deletable={false}
        draggable={false}
        selected={false}
        isConnectable={false}
      />
    </ReactFlowProvider>,
  );
}

describe("ContextBlockFlowNode", () => {
  describe("rendering", () => {
    it("renders the previous-block eyebrow when direction='previous'", () => {
      renderNode("previous");
      expect(screen.getByText("← previous block")).toBeInTheDocument();
    });

    it("renders the next-block eyebrow when direction='next'", () => {
      renderNode("next");
      expect(screen.getByText("next block →")).toBeInTheDocument();
    });

    it("renders the sibling's label and meta in both directions", () => {
      const { rerender } = renderNode("previous");
      expect(screen.getByText("Transformer block 1")).toBeInTheDocument();
      expect(screen.getByText("masked attention + FFN")).toBeInTheDocument();
      rerender(
        <ReactFlowProvider>
          <ContextBlockFlowNode
            id="__context_next__block_1"
            data={{ specNode: sibling, contextPath: ["block_1"], direction: "next" } as unknown as Record<string, unknown>}
            type="context"
            position={{ x: 0, y: 0 }}
            positionAbsoluteX={0}
            positionAbsoluteY={0}
            zIndex={0}
            dragging={false}
            selectable={false}
            deletable={false}
            draggable={false}
            selected={false}
            isConnectable={false}
          />
        </ReactFlowProvider>,
      );
      expect(screen.getByText("Transformer block 1")).toBeInTheDocument();
    });

    it("applies the directional CSS class (previous vs next) so the tail points the right way", () => {
      const { container, unmount } = renderNode("previous");
      expect(container.querySelector('[role="button"]')?.className).toContain("previous");
      unmount();
      const { container: c2 } = renderNode("next");
      expect(c2.querySelector('[role="button"]')?.className).toContain("next");
    });
  });

  describe("interaction", () => {
    it("clicking either direction calls goToExpansion with the context path", async () => {
      useArchStore.setState({ expansionPath: ["block_2"] });
      const { unmount } = renderNode("previous");
      await userEvent.click(
        screen.getByRole("button", { name: /Open Transformer block 1/ }),
      );
      expect(useArchStore.getState().expansionPath).toEqual(["block_1"]);

      // Mount the next variant and verify the same handler fires.
      useArchStore.setState({ expansionPath: ["block_2"] });
      unmount();
      renderNode("next");
      await userEvent.click(
        screen.getByRole("button", { name: /Open Transformer block 1/ }),
      );
      expect(useArchStore.getState().expansionPath).toEqual(["block_1"]);
    });

    it("Enter and Space keyboard activate the navigation", async () => {
      useArchStore.setState({ expansionPath: ["block_2"] });
      renderNode("previous");
      const card = screen.getByRole("button", { name: /Open Transformer block 1/ });
      card.focus();
      await userEvent.keyboard("{Enter}");
      expect(useArchStore.getState().expansionPath).toEqual(["block_1"]);

      useArchStore.setState({ expansionPath: ["block_2"] });
      card.focus();
      await userEvent.keyboard(" ");
      expect(useArchStore.getState().expansionPath).toEqual(["block_1"]);
    });
  });
});
