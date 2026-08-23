import type { ProviderId } from "../models.js";
import { claudeProvider } from "./claude.js";
import { cursorProvider } from "./cursor.js";
import { kimiProvider } from "./kimi.js";
import type { Provider } from "./base.js";

const providers: Record<ProviderId, Provider> = {
  claude: claudeProvider,
  cursor: cursorProvider,
  kimi: kimiProvider,
};

export function getProvider(id: ProviderId): Provider {
  return providers[id];
}
