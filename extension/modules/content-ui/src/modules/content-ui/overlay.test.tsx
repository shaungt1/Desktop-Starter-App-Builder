// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";
import { Overlay } from "./overlay";

afterEach(cleanup);

describe("Overlay", () => {
  test("shows a panel that the user can close", async () => {
    render(<Overlay />);
    expect(screen.getByText(/added to the page/iu)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText(/added to the page/iu)).not.toBeInTheDocument();
  });
});
