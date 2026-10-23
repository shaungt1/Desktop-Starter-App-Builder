/**
 * Typed, validated messages between the extension's parts (popup, options page,
 * content scripts and the background service worker).
 *
 * Every message has a name, a request shape and a response shape, declared once
 * in `messages` below. `sendMessage` and `onMessage` derive their types from it,
 * and the receiving side validates the request with Zod before running a handler,
 * because a message can come from any page the extension runs on and is untrusted.
 */
import { browser } from "wxt/browser";
import { z } from "zod";

/** The message protocol. To add a message, add an entry here, then handle it in entrypoints/background.ts. */
export const messages = {
  ping: {
    request: z.object({ text: z.string().max(200) }),
    response: z.object({ reply: z.string(), receivedAt: z.number() }),
  },
} as const;

export type MessageName = keyof typeof messages;
export type MessageRequest<N extends MessageName> = z.input<(typeof messages)[N]["request"]>;
export type MessageResponse<N extends MessageName> = z.output<(typeof messages)[N]["response"]>;

/** The envelope that travels through `browser.runtime.sendMessage`. */
const envelope = z.object({ name: z.string(), payload: z.unknown() });

type Handlers = {
  [N in MessageName]?: (
    request: z.output<(typeof messages)[N]["request"]>,
  ) => MessageResponse<N> | Promise<MessageResponse<N>>;
};

/** Sends one message to the background service worker and returns its validated response. */
export async function sendMessage<N extends MessageName>(
  name: N,
  payload: MessageRequest<N>,
): Promise<MessageResponse<N>> {
  const raw: unknown = await browser.runtime.sendMessage({ name, payload });
  return messages[name].response.parse(raw) as MessageResponse<N>;
}

/**
 * Validates an incoming envelope and runs the matching handler. Returns
 * `undefined` when the message is not one of this extension's messages, so other
 * listeners (for example from a module) can answer it. Throws when a known
 * message has an invalid request, so a malformed message never reaches a handler.
 */
export async function dispatch(raw: unknown, handlers: Handlers): Promise<unknown> {
  const parsed = envelope.safeParse(raw);
  if (!parsed.success) {
    return undefined;
  }
  // Own properties only: a message named "constructor" or "toString" must not reach inherited functions.
  if (!Object.hasOwn(messages, parsed.data.name) || !Object.hasOwn(handlers, parsed.data.name)) {
    return undefined;
  }
  const name = parsed.data.name as MessageName;
  const definition = messages[name];
  const handler = handlers[name] as ((request: unknown) => unknown) | undefined;
  if (!handler) {
    return undefined;
  }
  const request = definition.request.parse(parsed.data.payload);
  return definition.response.parse(await handler(request));
}

/** True when `raw` is a message this extension handles. Decided synchronously, because Chrome needs to know at once whether a listener will answer. */
export function handles(raw: unknown, handlers: Handlers): boolean {
  const parsed = envelope.safeParse(raw);
  return parsed.success && Object.hasOwn(messages, parsed.data.name) && Object.hasOwn(handlers, parsed.data.name);
}

/**
 * Registers the background's handlers. Call it once, synchronously, at the top
 * level of `defineBackground`: the service worker is stopped when idle and the
 * browser can only wake it for listeners that were registered while it started.
 * Messages that are not part of the protocol are left unanswered (the listener
 * returns false), so any other `onMessage` listener, such as one a module adds,
 * can still answer them.
 */
export function listen(handlers: Handlers): void {
  browser.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
    if (!handles(raw, handlers)) {
      return false;
    }
    dispatch(raw, handlers).then(
      (response) => sendResponse(response),
      (error: unknown) => sendResponse({ error: error instanceof Error ? error.message : String(error) }),
    );
    // Returning true keeps the channel open for the asynchronous response.
    return true;
  });
}
