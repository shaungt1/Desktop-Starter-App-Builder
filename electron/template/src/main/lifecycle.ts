/**
 * App-wide lifecycle switches modules can change.
 */
export const lifecycle = {
  /**
   * When true, closing every window keeps the app running (for example with a
   * tray icon and a background worker). The background module turns it on.
   */
  keepRunningInBackground: false,
  /** Set while the app is quitting so close handlers do not cancel the quit. */
  quitting: false,
};
