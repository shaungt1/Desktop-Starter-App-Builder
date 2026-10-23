// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PopupScreen } from "@/src/app/popup-screen";

vi.mock("@/src/lib/messaging", () => ({
  sendMessage: vi.fn(async (_name: string, payload: { text: string }) => ({
    reply: `Background received: ${payload.text}`,
    receivedAt: 1,
  })),
}));

afterEach(cleanup);

describe("PopupScreen", () => {
  test("shows the saved greeting and the extension name", async () => {
    render(<PopupScreen />);
    expect(await screen.findByText(/Hello from/u)).toBeInTheDocument();
  });

  test("shows the background worker's reply after the button is pressed", async () => {
    render(<PopupScreen />);
    await screen.findByText(/Hello from/u);
    await userEvent.click(screen.getByRole("button", { name: /ask the background worker/iu }));
    expect(await screen.findByTestId("reply")).toHaveTextContent("Background received: Hello from");
  });
});
