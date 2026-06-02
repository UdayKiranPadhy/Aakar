import { describe, expect, it } from "vitest";

import { toLoadError } from "./loadError";
import {
  ApiError,
  ModelGatedError,
  ModelNotFoundError,
  NetworkError,
  UnsupportedArchitectureError,
} from "../infrastructure/api/errors";

describe("toLoadError", () => {
  it("maps UnsupportedArchitectureError with architecture + custom-code hint", () => {
    const e = toLoadError(
      new UnsupportedArchitectureError("nvidia/LocateAnything-3B", null, "can't load"),
    );
    expect(e.kind).toBe("unsupported");
    expect(e.modelId).toBe("nvidia/LocateAnything-3B");
    expect(e.architecture).toBeNull();
    expect(e.detail).toBe("can't load");
    expect(e.status).toBe(422);
    expect(e.hint).toMatch(/trust_remote_code|custom/i);
  });

  it("maps ModelNotFoundError", () => {
    const e = toLoadError(new ModelNotFoundError("ghost/model", "missing"));
    expect(e.kind).toBe("not_found");
    expect(e.modelId).toBe("ghost/model");
    expect(e.status).toBe(404);
  });

  it("maps ModelGatedError", () => {
    const e = toLoadError(new ModelGatedError("private/m", "gated"));
    expect(e.kind).toBe("gated");
    expect(e.status).toBe(403);
  });

  it("maps NetworkError", () => {
    const e = toLoadError(new NetworkError("Failed to fetch"));
    expect(e.kind).toBe("network");
    expect(e.detail).toMatch(/failed to fetch/i);
  });

  it("maps bare ApiError by status code", () => {
    expect(toLoadError(new ApiError(504, "slow")).kind).toBe("timeout");
    expect(toLoadError(new ApiError(502, "boom")).kind).toBe("failed");
    expect(toLoadError(new ApiError(503, "down")).kind).toBe("unavailable");
    expect(toLoadError(new ApiError(400, "bad")).kind).toBe("bad_request");
    expect(toLoadError(new ApiError(500, "boom")).kind).toBe("server_error");
    expect(toLoadError(new ApiError(501, "?")).kind).toBe("server_error");
  });

  it("carries the model id through a generic ApiError", () => {
    const e = toLoadError(new ApiError(503, "down", "org/model"));
    expect(e.kind).toBe("unavailable");
    expect(e.modelId).toBe("org/model");
  });

  it("maps non-Error values to an unknown error", () => {
    const e = toLoadError("weird");
    expect(e.kind).toBe("unknown");
    expect(e.detail).toBe("Unknown error.");
  });
});
