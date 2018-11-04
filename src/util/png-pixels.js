import { ColorTypes, BitDepths, PixelLayouts } from './constants';

export const hashPixelData = (colorData) => {
  console.log('colorData', colorData);
  return colorData.join(',');
}

export const hashPixelIndexKey = (index) => String(index);

export const unhashPixelIndexKey = (index) => Number(index);

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
  let trnsIndex = 0;

  while (i < pixelData.length) {
    let value = pixelData[i++];
    formattedData[n++] = value;
    formattedData[n++] = value;
    formattedData[n++] = value;

    if (numberOfValuesInLayout === 4) {
      formattedData[n++] = 'undefined' !== typeof trnsData[trnsIndex]
        ? trnsData[trnsIndex]
        : 255;
      trnsIndex++;
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
  let i = 0;
  let n = 0;
  let trnsIndex = 0;

  while (i < pixelData.length) {
    formattedData[n++] = pixelData[i++];
    formattedData[n++] = pixelData[i++];
    formattedData[n++] = pixelData[i++];
    formattedData[n++] = 'undefined' !== typeof trnsData[trnsIndex]
      ? trnsData[trnsIndex]
      : 255;
    trnsIndex++;
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
  let trnsIndex = 0;

  while (i < pixelData.length) {
    formattedData[n++] = pixelData[i++];
    formattedData[n++] = pixelData[i++];
    formattedData[n++] = pixelData[i++];
    formattedData[n++] = 'undefined' !== typeof trnsData[trnsIndex]
      ? trnsData[trnsIndex]
      : 255;
    trnsIndex++;
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
