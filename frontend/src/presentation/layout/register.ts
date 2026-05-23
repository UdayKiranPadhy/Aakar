/**
 * Default layout-strategy registrations.
 *
 * v0.1: fan-out for self_attention (level-3 view). Everything else uses
 * verticalStack (the fallback set in LayoutRegistry).
 *
 * Future: register fan-out variants for `moe_router`, `mixture_of_experts`, etc.
 */

import { layoutRegistry } from "./LayoutRegistry";
import { fanOut } from "./strategies/fanOut";

layoutRegistry.register("self_attention", fanOut);
