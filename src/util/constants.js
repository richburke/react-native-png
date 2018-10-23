export const DEFAULT_TRANSPARENCY = 255;
export const DEFAULT_COMPRESSION = 0;
export const DEFAULT_FILTER = 0;
export const DEFAULT_INTERLACE = 0;

export const SupportedChunks = [
  'IHDR',
  'PLTE',
  'tRNS',
  'IDAT',
  'bGND', // ?
  'IEND',
];

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
