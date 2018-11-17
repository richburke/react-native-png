import { ColorTypes, BitDepths, PixelLayouts } from './constants';

export const hashPixelData = (colorData) => colorData.join(',');

export const hashPixelIndexKey = (index) => String(index);

export const unhashPixelIndexKey = (index) => Number(index);

export const computeNumberOfPixels = (width, height) => width * height;

export const computeMaxNumberOfColors = (depth) => 2 ** depth;

export const isGrayscale = (colorType) => colorType === ColorTypes.GRAYSCALE;

export const isTruecolor = (colorType) => colorType === ColorTypes.TRUECOLOR;

export const isIndexed = (colorType) => colorType === ColorTypes.INDEXED;

export const isGrayscaleWithAlpha = (colorType) => colorType === ColorTypes.GRAYSCALE_AND_ALPHA;

export const isTruecolorWithAlpha = (colorType) => colorType === ColorTypes.TRUECOLOR_AND_ALPHA;

export const hasAlphaSample = (colorType) =>
  isGrayscaleWithAlpha(colorType) || isTruecolorWithAlpha(colorType);

export const determinePixelColorSize = (colorType) =>
  isGrayscale(colorType) || isGrayscaleWithAlpha(colorType) || isIndexed(colorType)
    ? 1
    : 3;

export const determineFullPixelSize = (colorType) =>
  determinePixelColorSize(colorType) + (hasAlphaSample(colorType) ? 1 : 0);

export const determineBytesPerPixel = (depth, colorType) => {
  if (BitDepths.ONE === depth) {
    return 1 / 8;
  }
  if (BitDepths.TWO === depth) {
    return 1 / 4;
  }
  if (BitDepths.FOUR === depth) {
    return 1 / 2;
  }
  return determineFullPixelSize(colorType);
};

export const determineDataRowLength = (depth, colorType, width) => 
  Math.ceil(determineBytesPerPixel(depth, colorType) * width);

export const determineTransparencySamplesPerEntry = (colorType) =>
  isTruecolor(colorType)
    ? 3
    : 1;

export const determineTransparencySpacePerSample = (colorType) => 
  isGrayscale(colorType) || isTruecolor(colorType)
    ? 2
    : 1;

export const determineBackgroundSamplesPerEntry = (colorType) => {
  if (ColorTypes.INDEXED === colorType
    || ColorTypes.GRAYSCALE === colorType
    || ColorTypes.GRAYSCALE_AND_ALPHA == colorType) {
    return 1;
  }
  return 3;
};

const formatPixelsForColorType0 = (pixelData, trnsData, numberOfValuesInLayout) => {
  const formattedData = new Uint8ClampedArray(pixelData.length * numberOfValuesInLayout);
  let i = 0;
  let n = 0;

  while (i < pixelData.length) {
    let value = pixelData[i++];
    formattedData[n++] = value;
    formattedData[n++] = value;
    formattedData[n++] = value;

    if (numberOfValuesInLayout === 4) {
      formattedData[n++] = trnsData.includes(value)
        ? 0
        : 255;
    }
  }
  return formattedData;
};

const formatPixelsForColorType2 = (pixelData, trnsData, numberOfValuesInLayout, width, height) => {
  if (3 === numberOfValuesInLayout) {
    return pixelData;
  }

  const numberOfPixels = computeNumberOfPixels(width, height);
  const formattedData = new Uint8ClampedArray(pixelData.length + numberOfPixels);
  const hashedTrnsData = trnsData.map((element) => hashPixelData(element));
  let i = 0;
  let n = 0;

  while (i < pixelData.length) {
    let r = pixelData[i++];
    let g = pixelData[i++];
    let b = pixelData[i++];
    let hashedPixel = hashPixelData([r, g, b]);

    formattedData[n++] = r;
    formattedData[n++] = g;
    formattedData[n++] = b;
    formattedData[n++] = hashedTrnsData.includes(hashedPixel)
      ? 0
      : 255;
  }
  return formattedData;
};

const formatPixelsForColorType3 = (pixelData, trnsData, numberOfValuesInLayout, width, height) => {
  if (3 === numberOfValuesInLayout) {
    return pixelData;
  }

  const numberOfPixels = computeNumberOfPixels(width, height);
  const formattedData = new Uint8ClampedArray(pixelData.length + numberOfPixels);
  let i = 0;
  let n = 0;
  let pixelIndex = 0;

  while (i < pixelData.length) {
    formattedData[n++] = pixelData[i++];
    formattedData[n++] = pixelData[i++];
    formattedData[n++] = pixelData[i++];
    formattedData[n++] = 'undefined' !== typeof trnsData[pixelIndex]
      ? trnsData[pixelIndex]
      : 255;
    pixelIndex++;
  }
  return formattedData;
};

const formatPixelsForColorType4 = (pixelData, numberOfValuesInLayout, width, height) => {
  let formattedData;

  if (3 === numberOfValuesInLayout) {
    const numberOfPixels = computeNumberOfPixels(width, height);
    formattedData = new Uint8ClampedArray(numberOfPixels * 3);
    let i = 0;
    let n = 0;

    while (i < pixelData.length) {
      let luminousity = pixelData[i++];
      formattedData[n++] = luminousity;
      formattedData[n++] = luminousity;
      formattedData[n++] = luminousity;
      i++; // Alpha, which we'll skip.
    }
  } else {
    formattedData = new Uint8ClampedArray(pixelData.length * 2);
    let i = 0;
    let n = 0;

    while (i < pixelData.length) {
      let luminousity = pixelData[i++];
      formattedData[n++] = luminousity;
      formattedData[n++] = luminousity;
      formattedData[n++] = luminousity;
      formattedData[n++] = pixelData[i++]; // Alpha
    }
  }

  return formattedData;
};

const formatPixelsForColorType6 = (pixelData, numberOfValuesInLayout, width, height) => {
  if (4 === numberOfValuesInLayout) {
    return pixelData;
  }

  const numberOfPixels = computeNumberOfPixels(width, height);
  const formattedData = new Uint8ClampedArray(pixelData.length - numberOfPixels);
  let i = 0;
  let n = 0;

  while (i < pixelData.length) {
    formattedData[n++] = pixelData[i++];
    formattedData[n++] = pixelData[i++];
    formattedData[n++] = pixelData[i++];
    i++;  // Alpha, which we'll skip.
  }

  return formattedData;
};

export const formatPixels = (colorType, width, height, pixelLayout, pixelData, trnsData) => {
  const numberOfValuesInLayout = PixelLayouts.RGB === pixelLayout
  ? 3
  : 4;
  if (ColorTypes.GRAYSCALE === colorType) {
    return formatPixelsForColorType0(pixelData, trnsData, numberOfValuesInLayout);
  }
  if (ColorTypes.TRUECOLOR === colorType) {
    return formatPixelsForColorType2(pixelData, trnsData, numberOfValuesInLayout, width, height);
  }
  if (ColorTypes.INDEXED === colorType) {
    return formatPixelsForColorType3(pixelData, trnsData, numberOfValuesInLayout, width, height);
  }
  if (ColorTypes.GRAYSCALE_AND_ALPHA === colorType) {
    return formatPixelsForColorType4(pixelData, numberOfValuesInLayout, width, height);
  }
  if (ColorTypes.TRUECOLOR_AND_ALPHA === colorType) {
    return formatPixelsForColorType6(pixelData, numberOfValuesInLayout, width, height);
  }
};
