export type RuntimeMapImage = { width: number; height: number; data: Uint8ClampedArray };

export const DELTA_EMOJI_PIXEL_RATIO = 2;
export const DELTA_EMOJI_LOGICAL_SIZE = 44;

type Rgba = readonly [number, number, number, number];
type Point = readonly [number, number];

const MAP_DARK: Rgba = [7, 16, 31, 255];
const POSITIVE_START: Rgba = [94, 224, 209, 255];
const POSITIVE_END: Rgba = [34, 211, 238, 255];
const NEGATIVE_START: Rgba = [251, 113, 133, 255];
const NEGATIVE_END: Rgba = [249, 115, 22, 255];
const NEW_STATUS: Rgba = [250, 204, 21, 255];
const CHECKING_GLOW: Rgba = [245, 158, 11, 76];
const CONFIRMED_BORDER: Rgba = [224, 242, 254, 255];
const FORK_PRIMARY: Rgba = [167, 139, 250, 255];
const FORK_SECONDARY: Rgba = [124, 58, 237, 255];
const HIGHLIGHT_GLOW: Rgba = [125, 249, 255, 84];

function mix(from: Rgba, to: Rgba, amount: number): Rgba {
  const value = Math.max(0, Math.min(1, amount));
  return [
    Math.round(from[0] + (to[0] - from[0]) * value),
    Math.round(from[1] + (to[1] - from[1]) * value),
    Math.round(from[2] + (to[2] - from[2]) * value),
    Math.round(from[3] + (to[3] - from[3]) * value),
  ];
}

function pointInPolygon(x: number, y: number, points: Point[]): boolean {
  let inside = false;
  for (let current = 0, previous = points.length - 1; current < points.length; previous = current++) {
    const [currentX, currentY] = points[current];
    const [previousX, previousY] = points[previous];
    const crosses = (currentY > y) !== (previousY > y)
      && x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX;
    if (crosses) inside = !inside;
  }
  return inside;
}

function distanceToSegment(x: number, y: number, start: Point, end: Point): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(x - start[0], y - start[1]);
  const amount = Math.max(0, Math.min(1, ((x - start[0]) * dx + (y - start[1]) * dy) / lengthSquared));
  return Math.hypot(x - (start[0] + amount * dx), y - (start[1] + amount * dy));
}

export function createDeltaEmojiImage(key: string): RuntimeMapImage {
  const scale = DELTA_EMOJI_PIXEL_RATIO;
  const width = DELTA_EMOJI_LOGICAL_SIZE * scale;
  const height = DELTA_EMOJI_LOGICAL_SIZE * scale;
  const data = new Uint8ClampedArray(width * height * 4);
  const negative = key.includes('negative');
  const checking = key.includes('checking');
  const confirmed = key.includes('confirmed');
  const fork = key.includes('fork');
  const archived = key.includes('archived');
  const emphasized = key.includes('highlighted') || key.includes('selected');

  const blend = (x: number, y: number, color: Rgba) => {
    if (x < 0 || y < 0 || x >= width || y >= height || color[3] === 0) return;
    const index = (y * width + x) * 4;
    const sourceAlpha = color[3] / 255;
    const destinationAlpha = data[index + 3] / 255;
    const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
    if (outputAlpha === 0) return;
    data[index] = Math.round((color[0] * sourceAlpha + data[index] * destinationAlpha * (1 - sourceAlpha)) / outputAlpha);
    data[index + 1] = Math.round((color[1] * sourceAlpha + data[index + 1] * destinationAlpha * (1 - sourceAlpha)) / outputAlpha);
    data[index + 2] = Math.round((color[2] * sourceAlpha + data[index + 2] * destinationAlpha * (1 - sourceAlpha)) / outputAlpha);
    data[index + 3] = Math.round(outputAlpha * 255);
  };

  const circle = (centerX: number, centerY: number, radius: number, color: Rgba | ((x: number, y: number) => Rgba)) => {
    const startX = Math.floor((centerX - radius - 1) * scale);
    const endX = Math.ceil((centerX + radius + 1) * scale);
    const startY = Math.floor((centerY - radius - 1) * scale);
    const endY = Math.ceil((centerY + radius + 1) * scale);
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const logicalX = (x + 0.5) / scale;
        const logicalY = (y + 0.5) / scale;
        const distance = Math.hypot(logicalX - centerX, logicalY - centerY);
        const coverage = Math.max(0, Math.min(1, (radius + 0.35 - distance) * scale));
        if (coverage === 0) continue;
        const source = typeof color === 'function' ? color(logicalX, logicalY) : color;
        blend(x, y, [source[0], source[1], source[2], Math.round(source[3] * coverage)]);
      }
    }
  };

  const polygon = (points: Point[], color: Rgba) => {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (pointInPolygon((x + 0.5) / scale, (y + 0.5) / scale, points)) blend(x, y, color);
      }
    }
  };

  const stroke = (points: Point[], thickness: number, color: Rgba) => {
    const radius = thickness / 2;
    for (let segment = 1; segment < points.length; segment += 1) {
      const start = points[segment - 1];
      const end = points[segment];
      const minX = Math.floor((Math.min(start[0], end[0]) - radius - 1) * scale);
      const maxX = Math.ceil((Math.max(start[0], end[0]) + radius + 1) * scale);
      const minY = Math.floor((Math.min(start[1], end[1]) - radius - 1) * scale);
      const maxY = Math.ceil((Math.max(start[1], end[1]) + radius + 1) * scale);
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const distance = distanceToSegment((x + 0.5) / scale, (y + 0.5) / scale, start, end);
          const coverage = Math.max(0, Math.min(1, (radius + 0.3 - distance) * scale));
          if (coverage > 0) blend(x, y, [color[0], color[1], color[2], Math.round(color[3] * coverage)]);
        }
      }
    }
  };

  const directionStart = archived ? [100, 116, 139, 255] as Rgba : negative ? NEGATIVE_START : POSITIVE_START;
  const directionEnd = archived ? [71, 85, 105, 255] as Rgba : negative ? NEGATIVE_END : POSITIVE_END;
  const directionColor = (x: number, y: number) => mix(directionStart, directionEnd, Math.max(0, Math.min(1, (x + y - 12) / 50)));

  if (emphasized) circle(22, 20.5, 21, HIGHLIGHT_GLOW);
  if (checking) circle(22, 20.5, 20, CHECKING_GLOW);

  polygon([[17, 32], [27, 32], [22, 44.5]], [0, 0, 0, 112]);
  polygon([[17.5, 31.5], [26.5, 31.5], [22, 44.5]], directionEnd);

  const outerColor = confirmed ? CONFIRMED_BORDER : archived ? directionEnd : MAP_DARK;
  circle(22, 20.5, 18.5, outerColor);
  circle(22, 20.5, confirmed ? 16.1 : 16.8, directionColor);

  circle(16.2, 17.2, 1.75, MAP_DARK);
  circle(27.8, 17.2, 1.75, MAP_DARK);

  if (negative) {
    stroke([[14.3, 14.8], [18.2, 13.3]], 1.4, MAP_DARK);
    stroke([[25.8, 13.3], [29.7, 14.8]], 1.4, MAP_DARK);
    stroke([[15.8, 27], [18.5, 24.4], [22, 23.4], [25.5, 24.4], [28.2, 27]], 2, MAP_DARK);
  } else {
    circle(13.5, 22.2, 2, [255, 255, 255, 48]);
    circle(30.5, 22.2, 2, [255, 255, 255, 48]);
    stroke([[15.8, 23.1], [18.5, 25.6], [22, 26.7], [25.5, 25.6], [28.2, 23.1]], 2, MAP_DARK);
  }

  if (key.includes('new')) {
    circle(35.5, 7.5, 5.1, MAP_DARK);
    circle(35.5, 7.5, 3.3, NEW_STATUS);
  }
  if (fork) {
    circle(33.5, 7, 5, MAP_DARK);
    circle(33.5, 7, 3.4, FORK_PRIMARY);
    circle(38, 11, 5, MAP_DARK);
    circle(38, 11, 3.4, FORK_SECONDARY);
  }

  return { width, height, data };
}
