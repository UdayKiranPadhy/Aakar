/**
 * A trending/popular model from the Hub list endpoint — mirrors the backend
 * `HubTrendingItem`. Drives the (no-longer-hardcoded) example/quick-model chips.
 */

export type TrendingModel = Readonly<{
  model_id: string;
  downloads?: number;
  likes?: number;
  pipeline_tag?: string;
  library_name?: string;
  tags: ReadonlyArray<string>;
}>;
