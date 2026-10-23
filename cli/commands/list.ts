/**
 * `list` — prints the bases, their renderer profiles and the rule for
 * choosing between them, straight from config/catalog.json.
 */
import { BASE_IDS, loadCatalog } from "../lib/catalog.ts";
import { heading, info } from "../lib/log.ts";

export function listCommand(): void {
  const catalog = loadCatalog();
  for (const id of BASE_IDS) {
    const base = catalog.bases[id];
    heading(`${base.title} (${id})`);
    info(base.summary);
    info("Choose it when:");
    for (const reason of base.chooseWhen) {
      info(`  - ${reason}`);
    }
    info("Avoid it when:");
    for (const reason of base.avoidWhen) {
      info(`  - ${reason}`);
    }
    info("Profiles:");
    for (const [profileId, profile] of Object.entries(base.profiles)) {
      const marker = profileId === base.defaultProfile ? " (default)" : "";
      info(`  ${profileId}${marker}: ${profile.summary}`);
    }
  }
  info("");
  info("Modules: bash start.sh module list");
}
