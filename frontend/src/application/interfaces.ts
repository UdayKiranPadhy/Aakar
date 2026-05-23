/**
 * Abstract interfaces the application layer depends on.
 *
 * Concrete implementations live in `infrastructure/`. Tests can inject any
 * object satisfying the shape — no mocking framework needed.
 */

import type { Spec } from "../domain/spec";

export interface ArchitectureRepository {
  fetch(modelId: string): Promise<Spec>;
}
