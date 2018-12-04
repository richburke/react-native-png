/**
 * @see https://www.w3.org/TR/PNG-Filters.html
 */

const defilterSub = (rowData, bytesPerPixel) => {
  bytesPerPixel = bytesPerPixel < 1 ? 1 : bytesPerPixel;
  const rowSize = rowData.byteLength;

  for (let i = bytesPerPixel; i < rowSize; i++) {
    // console.log('filter, row data', rowData, i, i - bytesPerPixel)
    rowData[i] = (rowData[i] + rowData[i - bytesPerPixel]) & 255;
    // rowData[i] = (rowData[i] + rowData[i - bytesPerPixel]) & 255;
  }
};

const defilterUp = (rowData, previousRowData) => {
  const rowSize = rowData.byteLength;
  for (let i = 0; i < rowSize; i++) {
    rowData[i] = (rowData[i] + previousRowData[i]) & 255;
  }
};

const defilterAverage = (rowData, bytesPerPixel, previousRowData) => {
  bytesPerPixel = bytesPerPixel < 1 ? 1 : bytesPerPixel;
  const rowSize = rowData.byteLength;
  for (let i = bytesPerPixel; i < rowSize; i++) {
    rowData[i] = Math.floor((rowData[i - bytesPerPixel] + previousRowData[i]) / 2) & 255;
  }
};

const computePaeth = (left, above, aboveLeft) => {
  const initial = left + above - aboveLeft;
  const deltaLeft = Math.abs(initial - left);
  const deltaAbove = Math.abs(initial - above);
  const deltaAboveLeft = Math.abs(initial - aboveLeft);

  if (deltaLeft <= deltaAbove &&
    deltaLeft <= deltaAboveLeft) {
      return left;
  }
  if (deltaAbove <= deltaAboveLeft) {
      return above;
  }
  return aboveLeft;
};

const defilterPaeth = (rowData, bytesPerPixel, previousRowData) => {
  bytesPerPixel = bytesPerPixel < 1 ? 1 : bytesPerPixel;
  const rowSize = rowData.byteLength;
  let previousPixelIndex;
  let left;
  let above;
  let aboveLeft;

  for (let i = 0; i < rowSize; i++) {
    previousPixelIndex = i - bytesPerPixel;
    if (previousPixelIndex < 0) {
      left = 0;
      aboveLeft = 0;
    } else {
      left = rowData[previousPixelIndex];
      aboveLeft = typeof previousRowData === 'undefined' ? 0 : previousRowData[previousPixelIndex];
    }
    above = typeof previousRowData === 'undefined' ? 0 : previousRowData[i];
    rowData[i] = (rowData[i] + computePaeth(left, above, aboveLeft)) & 255;
  }
}

export const defilter = (imageAndFilterData, dataRowLength, bytesPerPixel) => {
  const rowSize = dataRowLength + 1;
  let filter;
  let scanLine;
  let previousRow;
  let firstDataByteIndex;

  for (let i = 0, n = imageAndFilterData.byteLength; i < n; i += rowSize) {
    filter = imageAndFilterData[i];
    firstDataByteIndex = i + 1;

    scanLine = imageAndFilterData.subarray(firstDataByteIndex, firstDataByteIndex + rowSize - 1);
    // console.log('FILTER', filter);
    if (filter === 0) {
      // console.log('filter is none', bytesPerPixel);
    }
    if (filter === 1) {
      // console.log('filter is sub', bytesPerPixel);
      defilterSub(scanLine, bytesPerPixel);
    }
    if (filter === 2) {
      // console.log('filter is up');
      defilterUp(scanLine, previousRow, i);
    }
    if (filter === 3) {
      // console.log('filter is average!');
      defilterAverage(scanLine, bytesPerPixel, previousRow);
    }
    if (filter === 4) {
      // console.log('filter is paeth!');
      defilterPaeth(scanLine, bytesPerPixel, previousRow);
    }

    imageAndFilterData[i] = 0;
    previousRow = scanLine.slice(0);
  }

  /*
  let s = '\n';
  for (let i=0, n = imageAndFilterData.byteLength; i < n; i++) {
    s += '|' + imageAndFilterData[i];
    if ((i + 1) % 4 === 0) {
      s += '\n';
    }
  }
  console.log(s);
  */
}

export const removeFilterFields = (pixelAndFilterData, dataRowSize, height) => {
  const scanlineStep = dataRowSize + 1;
  let pixelOnlyData = new Uint8ClampedArray(pixelAndFilterData.length - height);

  for (let i = 0, n = 0; i < pixelAndFilterData.length; i += scanlineStep, n += dataRowSize) {
    let currentIndex = i + 1;
    let s = pixelAndFilterData.subarray(currentIndex, currentIndex + dataRowSize);
    // console.log('-->', i, n, s);
    pixelOnlyData.set(s, n);
  }
  return pixelOnlyData;
};

export const addFilterFields = (pixelOnlyData, dataRowSize, height) => {
  const scanlineStep = dataRowSize + 1;
  // console.log('pixelOnlyData length', pixelOnlyData.length);
  // let pixelAndFilterData = new Uint8ClampedArray(pixelOnlyData.length + 64);
  let pixelAndFilterData = new Uint8ClampedArray(pixelOnlyData.length + height);

  // console.log(pixelAndFilterData.length, dataRowSize, height, scanlineStep);

  for (let i = 0, n = 0, x = 0; x < height; i += dataRowSize, n += scanlineStep, x++) {
  // for (let i = 0, n = 0, x = 1; i < pixelOnlyData.length; i += dataRowSize, n += scanlineStep, x++) {
    // console.log('getting t')
    let t = pixelOnlyData.subarray(i, i + dataRowSize);
    let s = [0, ...t];
    // console.log(x, i);
    // console.log(x, t, s)
    // console.log('setting scanline');
    pixelAndFilterData.set(s, n);
  }
  return pixelAndFilterData;
};
