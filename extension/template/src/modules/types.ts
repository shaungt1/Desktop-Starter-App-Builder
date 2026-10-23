/** A piece of background-worker behavior contributed by an optional module (side panel, context menu, ...). */
export interface BackgroundModule {
  /** The module id, matching its folder name under src/modules. */
  id: string;
  /** Runs once, synchronously, when the service worker starts. Register event listeners here. */
  setup: () => void;
}
