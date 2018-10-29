import { ColorTypes } from './constants';

export const hashPixelKey = (colorData) => colorData.join(',');

export const unhashPixelKey = (hashedPixel) => hashedPixel.split(',');

export const computeNumberOfPixels = (width, height) => width * height;

export const computeMaxNumberOfColors = (depth) => 2 ** depth;

export const determinePixelColorSize = (colorType) =>
  colorType === ColorTypes.GRAYSCALE ||
    colorType == ColorTypes.GRAYSCALE_AND_ALPHA ||
    colorType == ColorTypes.INDEXED
    ? 1
    : 3;

export const determineHasAlphaSample = (colorType) =>
  colorType == ColorTypes.GRAYSCALE_AND_ALPHA || colorType == ColorTypes.TRUECOLOR_AND_ALPHA
    ? true
    : false;

export const determineTransparencySamplesPerEntry = (colorType) =>
  ColorTypes.TRUECOLOR === colorType
    ? 3
    : 1;

export const determineTransparencySpacePerSample = (colorType) => 
  ColorTypes.TRUECOLOR === colorType || ColorTypes.TRUECOLOR === colorType
    ? 2
    : 1;
