import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("renders the trigger text and hides the bubble by default", () => {
    render(<Tooltip content="A definition.">weight</Tooltip>);
    expect(screen.getByText("weight")).toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the bubble on hover and hides it on leave", () => {
    render(<Tooltip content="A definition.">weight</Tooltip>);
    const trigger = screen.getByText("weight");

    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole("tooltip")).toHaveTextContent("A definition.");

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("opens on keyboard focus and wires aria-describedby", () => {
    render(<Tooltip content="A definition.">weight</Tooltip>);
    const trigger = screen.getByText("weight");

    fireEvent.focus(trigger);
    const tip = screen.getByRole("tooltip");
    expect(trigger).toHaveAttribute("aria-describedby", tip.id);

    fireEvent.blur(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
