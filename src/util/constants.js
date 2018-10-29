export const DEFAULT_TRANSPARENCY = 255;
export const DEFAULT_COMPRESSION = 0;
export const DEFAULT_FILTER = 0;
export const DEFAULT_INTERLACE = 0;

export const SupportedChunks = [
  'IHDR',
  'PLTE',
  'tRNS',
  'bKGD',
  'IDAT',
  'IEND',
];

export const ChunkHeaderSequences = {
  IHDR: [73, 72, 68, 82],
  PLTE: [80, 76, 84, 69],
  tRNS: [116, 82, 78, 83],
  bKGD: [98, 75, 71, 68],
  IDAT: [73, 68, 65, 84],
  IEND: [73, 69, 78, 68],
};

export const BitDepths = {
  ONE: 1,
  TWO: 2,
  FOUR: 4,
  EIGHT: 8,
  SIXTEEN: 16,
};

export const ColorTypes = {
  GRAYSCALE: 0,
  TRUECOLOR: 2,
  INDEXED: 3,
  GRAYSCALE_AND_ALPHA: 4,
  TRUECOLOR_AND_ALPHA: 6,
};

export const ScanlineFilterTypes = {
  NONE: 0,
  SUB: 1,
  UP: 2,
  AVERAGE: 3,
  PAETH: 4,
};
