import { describe, expect, it } from 'vitest';
import { createDeltaEmojiImage, DELTA_EMOJI_LOGICAL_SIZE, DELTA_EMOJI_PIXEL_RATIO } from './deltaEmojiImage';

function containsColor(image: ReturnType<typeof createDeltaEmojiImage>, color: [number, number, number], tolerance = 0): boolean {
  for (let index = 0; index < image.data.length; index += 4) {
    if (Math.abs(image.data[index] - color[0]) <= tolerance
      && Math.abs(image.data[index + 1] - color[1]) <= tolerance
      && Math.abs(image.data[index + 2] - color[2]) <= tolerance
      && image.data[index + 3] > 0) return true;
  }
  return false;
}

function pixel(image: ReturnType<typeof createDeltaEmojiImage>, logicalX: number, logicalY: number) {
  const x = Math.round(logicalX * DELTA_EMOJI_PIXEL_RATIO);
  const y = Math.round(logicalY * DELTA_EMOJI_PIXEL_RATIO);
  const index = (y * image.width + x) * 4;
  return Array.from(image.data.slice(index, index + 4));
}

function brightness(value: number[]) { return value[0] + value[1] + value[2]; }

function maxOpaqueY(image: ReturnType<typeof createDeltaEmojiImage>): number {
  let result = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] > 0) result = y;
    }
  }
  return result;
}

describe('Delta emoji map image', () => {
  it('uses a high-density image with an opaque bottom pointer for a stable map anchor', () => {
    const image = createDeltaEmojiImage('delta-emoji-positive-new');
    expect(image.width).toBe(DELTA_EMOJI_LOGICAL_SIZE * DELTA_EMOJI_PIXEL_RATIO);
    expect(image.height).toBe(DELTA_EMOJI_LOGICAL_SIZE * DELTA_EMOJI_PIXEL_RATIO);
    expect(image.data).toHaveLength(image.width * image.height * 4);
    expect(maxOpaqueY(image)).toBeGreaterThanOrEqual(image.height - 2);
    expect(pixel(image, 22, 43)[3]).toBeGreaterThan(0);
  });

  it('draws a smile for improvement and a frown for deterioration', () => {
    const positive = createDeltaEmojiImage('delta-emoji-positive-confirmed');
    const negative = createDeltaEmojiImage('delta-emoji-negative-confirmed');
    expect(containsColor(positive, [94, 224, 209], 8)).toBe(true);
    expect(containsColor(negative, [251, 113, 133], 16)).toBe(true);
    expect(brightness(pixel(positive, 22, 27))).toBeLessThan(brightness(pixel(negative, 22, 27)));
    expect(brightness(pixel(negative, 22, 23))).toBeLessThan(brightness(pixel(positive, 22, 23)));
    expect(positive.data).not.toEqual(negative.data);
  });

  it('keeps every verification status visually distinct', () => {
    expect(containsColor(createDeltaEmojiImage('delta-emoji-positive-new'), [250, 204, 21])).toBe(true);
    expect(containsColor(createDeltaEmojiImage('delta-emoji-positive-checking'), [245, 158, 11], 1)).toBe(true);
    expect(containsColor(createDeltaEmojiImage('delta-emoji-positive-confirmed'), [224, 242, 254])).toBe(true);
    const fork = createDeltaEmojiImage('delta-emoji-negative-fork');
    expect(containsColor(fork, [167, 139, 250])).toBe(true);
    expect(containsColor(fork, [124, 58, 237])).toBe(true);
  });

  it('adds a cyan halo for selected and freshly updated markers', () => {
    const normal = createDeltaEmojiImage('delta-emoji-positive-checking');
    const selected = createDeltaEmojiImage('delta-emoji-positive-checking-selected');
    const highlighted = createDeltaEmojiImage('delta-emoji-positive-checking-highlighted');
    expect(selected.data).not.toEqual(normal.data);
    expect(highlighted.data).toEqual(selected.data);
    expect(containsColor(selected, [125, 249, 255], 2)).toBe(true);
  });
});
