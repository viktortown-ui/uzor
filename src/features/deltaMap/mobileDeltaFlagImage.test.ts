import { describe, expect, it } from 'vitest';
import { createMobileDeltaFlagImage, MOBILE_DELTA_FLAG_LOGICAL_SIZE, MOBILE_DELTA_FLAG_PIXEL_RATIO } from './mobileDeltaFlagImage';

function containsColor(image: ReturnType<typeof createMobileDeltaFlagImage>, color: [number, number, number], tolerance = 0): boolean {
  for (let index = 0; index < image.data.length; index += 4) {
    if (Math.abs(image.data[index] - color[0]) <= tolerance
      && Math.abs(image.data[index + 1] - color[1]) <= tolerance
      && Math.abs(image.data[index + 2] - color[2]) <= tolerance
      && image.data[index + 3] > 0) return true;
  }
  return false;
}

describe('mobile Delta flag image', () => {
  it('uses a high-density square image at the same logical footprint as the desktop marker', () => {
    const image = createMobileDeltaFlagImage('delta-flag-positive-new');
    expect(image.width).toBe(MOBILE_DELTA_FLAG_LOGICAL_SIZE * MOBILE_DELTA_FLAG_PIXEL_RATIO);
    expect(image.height).toBe(MOBILE_DELTA_FLAG_LOGICAL_SIZE * MOBILE_DELTA_FLAG_PIXEL_RATIO);
    expect(image.data).toHaveLength(image.width * image.height * 4);
  });

  it('uses desktop-equivalent visual language for every status', () => {
    expect(containsColor(createMobileDeltaFlagImage('delta-flag-positive-new'), [250, 204, 21])).toBe(true);
    expect(containsColor(createMobileDeltaFlagImage('delta-flag-positive-checking'), [245, 158, 11], 1)).toBe(true);
    expect(containsColor(createMobileDeltaFlagImage('delta-flag-positive-confirmed'), [224, 242, 254])).toBe(true);
    const fork = createMobileDeltaFlagImage('delta-flag-positive-fork');
    expect(containsColor(fork, [167, 139, 250])).toBe(true);
    expect(containsColor(fork, [124, 58, 237])).toBe(true);
  });

  it('keeps positive and negative direction colors distinct', () => {
    const positive = createMobileDeltaFlagImage('delta-flag-positive-new');
    const negative = createMobileDeltaFlagImage('delta-flag-negative-new');
    expect(containsColor(positive, [52, 211, 153], 8)).toBe(true);
    expect(containsColor(negative, [251, 113, 133], 8)).toBe(true);
    expect(positive.data).not.toEqual(negative.data);
  });
});
