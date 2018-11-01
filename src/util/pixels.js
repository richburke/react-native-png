import { ColorTypes, BitDepths } from './constants';

export const hashPixelKey = (colorData) => colorData.join(',');

export const unhashPixelKey = (hashedPixel) => hashedPixel.split(',');

export const computeNumberOfPixels = (width, height) => width * height;

export const computeMaxNumberOfColors = (depth) => 2 ** depth;

export const determinePixelColorSize = (colorType) =>
  colorType === ColorTypes.GRAYSCALE ||
    colorType === ColorTypes.GRAYSCALE_AND_ALPHA ||
    colorType === ColorTypes.INDEXED
    ? 1
    : 3;

export const determineHasAlphaSample = (colorType) =>
  colorType === ColorTypes.GRAYSCALE_AND_ALPHA || colorType === ColorTypes.TRUECOLOR_AND_ALPHA
    ? true
    : false;

export const determineDataRowLength = (depth, colorType, width) => {
  if (BitDepths.ONE === depth) {
    return Math.ceil(width / 8);
  }
  if (BitDepths.TWO === depth) {
    return Math.ceil(width / 4);
  }
  if (BitDepths.FOUR === depth) {
    return Math.ceil(width / 2);
  }
  return (determinePixelColorSize(colorType) + determineHasAlphaSample(colorType))
    * width;
};

export const determineTransparencySamplesPerEntry = (colorType) =>
  ColorTypes.TRUECOLOR === colorType
    ? 3
    : 1;

export const determineTransparencySpacePerSample = (colorType) => 
  ColorTypes.TRUECOLOR === colorType || ColorTypes.TRUECOLOR === colorType
    ? 2
    : 1;
