/**
 * Default detail-panel registrations.
 *
 * v0.1 ships only `GenericDetailPanel` (the fallback). To add a custom
 * detail panel for a specific block type, register here.
 */

import { detailRegistry } from "./DetailRegistry";
import { EmbeddingDetail } from "./EmbeddingDetail";
import { LinearDetail } from "./LinearDetail";

// Custom detail panels for core layers
detailRegistry.register("embedding", EmbeddingDetail);
detailRegistry.register("linear", LinearDetail);

