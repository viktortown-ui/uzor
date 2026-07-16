export type MapLibreErrorLike = { error?: { message?: string }; sourceId?: string } | Error | null | undefined;

const RESOURCE_ERROR = /tile|glyph|sprite|image|source|resource|network|fetch|request|http|timeout/i;
const STYLE_ERROR = /style|parse|stylesheet/i;

/** Resource failures are recoverable; only an unusable initial style is blocking. */
export function isFatalMapLibreError(error: MapLibreErrorLike, usable: boolean): boolean {
  if (usable) return false;
  const message = error instanceof Error ? error.message : error?.error?.message ?? '';
  if (RESOURCE_ERROR.test(message) || ('sourceId' in (error ?? {}) && Boolean((error as { sourceId?: string }).sourceId))) return false;
  return STYLE_ERROR.test(message);
}
