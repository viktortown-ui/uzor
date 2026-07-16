export type MapLibreErrorLike = { error?: { message?: string }; sourceId?: string } | Error | null | undefined;

const EXPLICIT_STYLE_ERROR = /(?:failed to load style|style (?:parse|load|validation) failure|style failed|stylesheet parse)/i;
const RESOURCE_ERROR = /(?:tile|glyph|sprite|image|source tile).*(?:failed|failure|timeout|request)|(?:failed|failure|timeout|request).*(?:tile|glyph|sprite|image)/i;

/** Resource failures are recoverable; only an unusable initial style is blocking. */
export function isFatalMapLibreError(error: MapLibreErrorLike, usable: boolean): boolean {
  if (usable) return false;
  const message = error instanceof Error ? error.message : error?.error?.message ?? '';
  if (EXPLICIT_STYLE_ERROR.test(message)) return true;
  if (RESOURCE_ERROR.test(message) || ('sourceId' in (error ?? {}) && Boolean((error as { sourceId?: string }).sourceId))) return false;
  return false;
}
