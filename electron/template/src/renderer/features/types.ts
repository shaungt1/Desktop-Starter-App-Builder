/**
 * Contract for a module's user interface. A module folder under
 * src/renderer/features/<id>/ exports `feature`; the generated registry.ts
 * lists the enabled ones and the home page renders their panels.
 */
import type { ComponentType } from "react";

export interface RendererFeature {
  id: string;
  title: string;
  description: string;
  Panel: ComponentType;
}
