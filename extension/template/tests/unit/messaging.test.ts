import { describe, expect, test } from "vitest";
import { dispatch, handles } from "@/src/lib/messaging";

const handlers = {
  ping: ({ text }: { text: string }) => ({ reply: `got ${text}`, receivedAt: 1 }),
};

describe("dispatch", () => {
  test("runs the handler for a valid message and validates the response", async () => {
    const response = await dispatch({ name: "ping", payload: { text: "hi" } }, handlers);
    expect(response).toEqual({ reply: "got hi", receivedAt: 1 });
  });

  test("rejects a known message with an invalid request before the handler runs", async () => {
    let called = false;
    const spy = {
      ping: () => {
        called = true;
        return { reply: "x", receivedAt: 1 };
      },
    };
    await expect(dispatch({ name: "ping", payload: { text: 42 } }, spy)).rejects.toThrow();
    expect(called).toBe(false);
  });

  test("ignores names inherited from Object.prototype", async () => {
    expect(await dispatch({ name: "constructor", payload: {} }, handlers)).toBeUndefined();
    expect(await dispatch({ name: "__proto__", payload: {} }, handlers)).toBeUndefined();
  });

  test("ignores messages that are not part of the protocol", async () => {
    expect(await dispatch({ name: "unknown", payload: {} }, handlers)).toBeUndefined();
    expect(await dispatch("not an envelope", handlers)).toBeUndefined();
  });

  test("rejects a handler response that breaks the declared shape", async () => {
    const broken = { ping: () => ({ reply: 5 }) } as never;
    await expect(dispatch({ name: "ping", payload: { text: "hi" } }, broken)).rejects.toThrow();
  });
});

describe("handles", () => {
  test("is true only for protocol messages that have a handler", () => {
    expect(handles({ name: "ping", payload: { text: "hi" } }, handlers)).toBe(true);
    expect(handles({ name: "ping", payload: {} }, {})).toBe(false);
    expect(handles({ name: "unknown", payload: {} }, handlers)).toBe(false);
    expect(handles("not an envelope", handlers)).toBe(false);
    expect(handles(undefined, handlers)).toBe(false);
    expect(handles({ name: "constructor", payload: {} }, handlers)).toBe(false);
    expect(handles({ name: "toString", payload: {} }, handlers)).toBe(false);
  });
});
