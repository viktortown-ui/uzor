export type RuntimeMapImage = { width: number; height: number; data: Uint8ClampedArray };

export const MOBILE_DELTA_FLAG_PIXEL_RATIO = 2;
export const MOBILE_DELTA_FLAG_LOGICAL_SIZE = 44;

type Rgba = readonly [number, number, number, number];
type Point = readonly [number, number];

const TRANSPARENT: Rgba = [0, 0, 0, 0];
const MAP_DARK: Rgba = [7, 16, 31, 255];
const MAST: Rgba = [248, 255, 255, 255];
const NEW_STATUS: Rgba = [250, 204, 21, 255];
const CHECKING_GLOW: Rgba = [245, 158, 11, 88];
const CONFIRMED_BORDER: Rgba = [224, 242, 254, 255];
const FORK_PRIMARY: Rgba = [167, 139, 250, 255];
const FORK_SECONDARY: Rgba = [124, 58, 237, 255];

const PRIMARY_FLAG: Point[] = [[22, 7], [42, 7], [38, 14.5], [42, 22], [22, 22]];
const PRIMARY_FLAG_INNER: Point[] = [[23.5, 8.5], [39.5, 8.5], [36.5, 14.5], [39.5, 20.5], [23.5, 20.5]];
const CHECKING_HALO: Point[] = [[19.5, 4.5], [43.5, 4.5], [41, 14.5], [43.5, 24.5], [19.5, 24.5]];
const FORK_FLAG: Point[] = [[27, 13], [42, 13], [39, 18.5], [42, 24], [27, 24]];

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

function mix(from: Rgba, to: Rgba, amount: number): Rgba {
  const value = Math.max(0, Math.min(1, amount));
  return [
    Math.round(from[0] + (to[0] - from[0]) * value),
    Math.round(from[1] + (to[1] - from[1]) * value),
    Math.round(from[2] + (to[2] - from[2]) * value),
    Math.round(from[3] + (to[3] - from[3]) * value),
  ];
}

export function createMobileDeltaFlagImage(key: string): RuntimeMapImage {
  const scale = MOBILE_DELTA_FLAG_PIXEL_RATIO;
  const width = MOBILE_DELTA_FLAG_LOGICAL_SIZE * scale;
  const height = MOBILE_DELTA_FLAG_LOGICAL_SIZE * scale;
  const data = new Uint8ClampedArray(width * height * 4);
  const negative = key.includes('negative');
  const fork = key.includes('fork');
  const checking = key.includes('checking');
  const confirmed = key.includes('confirmed');
  const archived = key.includes('archived');

  const blend = (x: number, y: number, color: Rgba) => {
    if (x < 0 || y < 0 || x >= width || y >= height || color === TRANSPARENT) return;
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

  const rectangle = (left: number, top: number, right: number, bottom: number, color: Rgba) => {
    for (let y = Math.floor(top * scale); y < Math.ceil(bottom * scale); y += 1) {
      for (let x = Math.floor(left * scale); x < Math.ceil(right * scale); x += 1) blend(x, y, color);
    }
  };

  const polygon = (points: Point[], color: Rgba | ((x: number, y: number) => Rgba)) => {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const logicalX = (x + 0.5) / scale;
        const logicalY = (y + 0.5) / scale;
        if (pointInPolygon(logicalX, logicalY, points)) blend(x, y, typeof color === 'function' ? color(logicalX, logicalY) : color);
      }
    }
  };

  const circle = (centerX: number, centerY: number, radius: number, color: Rgba) => {
    for (let y = Math.floor((centerY - radius - 1) * scale); y <= Math.ceil((centerY + radius + 1) * scale); y += 1) {
      for (let x = Math.floor((centerX - radius - 1) * scale); x <= Math.ceil((centerX + radius + 1) * scale); x += 1) {
        const distance = Math.hypot((x + 0.5) / scale - centerX, (y + 0.5) / scale - centerY);
        const coverage = Math.max(0, Math.min(1, (radius + 0.35 - distance) * scale));
        if (coverage > 0) blend(x, y, [color[0], color[1], color[2], Math.round(color[3] * coverage)]);
      }
    }
  };

  const directionGradient = (x: number, y: number): Rgba => {
    if (archived) return [100, 116, 139, 255];
    if (fork) return FORK_PRIMARY;
    const amount = Math.max(0, Math.min(1, ((x - 22) / 20 + (y - 7) / 15) / 2));
    return negative
      ? mix([251, 113, 133, 255], [249, 115, 22, 255], amount)
      : mix([52, 211, 153, 255], [34, 211, 238, 255], amount);
  };

  if (checking) polygon(CHECKING_HALO, CHECKING_GLOW);

  rectangle(21.5, 8.5, 24.5, 42.5, [0, 0, 0, 112]);
  rectangle(20.5, 7, 23.5, 42, MAST);

  if (fork) {
    polygon(FORK_FLAG.map(([x, y]) => [x + 1, y + 1] as Point), [0, 0, 0, 96]);
    polygon(FORK_FLAG, FORK_SECONDARY);
  }

  polygon(PRIMARY_FLAG.map(([x, y]) => [x + 1, y + 1] as Point), [0, 0, 0, 104]);
  if (confirmed) {
    polygon(PRIMARY_FLAG, CONFIRMED_BORDER);
    polygon(PRIMARY_FLAG_INNER, directionGradient);
  } else {
    polygon(PRIMARY_FLAG, directionGradient);
  }

  if (key.includes('new')) {
    circle(38.5, 5.5, 5, MAP_DARK);
    circle(38.5, 5.5, 3.25, NEW_STATUS);
  }

  return { width, height, data };
}
