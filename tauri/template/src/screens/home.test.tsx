import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockIPC } from "@tauri-apps/api/mocks";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomePage } from "./home";

describe("HomePage", () => {
  it("shows runtime details reported by the Rust core", async () => {
    // Module panels on the home page call their own commands; answer those with null.
    mockIPC(
      (command) => {
        if (command === "app_info") {
          return {
            name: "Test App",
            version: "1.2.3",
            platform: "linux",
            arch: "x86_64",
            tauri: "2.12.5",
            profile: "native",
            modules: [],
          };
        }
        return null;
      },
      { shouldMockEvents: true },
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <HomePage />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("app-version")).toHaveTextContent("1.2.3");
    expect(screen.getByText("2.12.5")).toBeInTheDocument();
  });
});
