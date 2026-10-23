// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomePage } from "./home";

vi.mock("@/lib/ipc", () => ({
  ipc: {
    app: {
      info: vi.fn(async () => ({
        name: "Test App",
        version: "1.2.3",
        platform: "linux",
        arch: "x64",
        electron: "45.0.0",
        chrome: "0",
        node: "24",
        profile: "native",
        modules: [],
      })),
    },
  },
}));

describe("HomePage", () => {
  it("shows runtime details reported by the main process", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <HomePage />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("app-version")).toHaveTextContent("1.2.3");
    expect(screen.getByText("native")).toBeInTheDocument();
  });
});
