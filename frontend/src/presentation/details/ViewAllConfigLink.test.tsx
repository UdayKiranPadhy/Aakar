import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ViewAllConfigLink } from "./ViewAllConfigLink";
import { useArchStore } from "../../store/archStore";

describe("ViewAllConfigLink", () => {
  it("switches the model view to the Config tab on click", async () => {
    useArchStore.setState({ modelView: "architecture" });
    render(<ViewAllConfigLink />);
    await userEvent.click(screen.getByRole("button", { name: /full model config/i }));
    expect(useArchStore.getState().modelView).toBe("config");
  });
});
