/**
 * @see https://www.w3.org/TR/PNG-Filters.html
 */

const defilterSub = (rowData, bytesPerPixel) => {
  const rowSize = rowData.byteLength;
  for (let i = bytesPerPixel; i < rowSize; i++) {
    rowData[i] = (rowData[i] + rowData[i - bytesPerPixel]) & 255;
  }
};

const defilterUp = (rowData, previousRowData) => {
  const rowSize = rowData.byteLength;
  for (let i = 0; i < rowSize; i++) {
    rowData[i] = (rowData[i] + previousRowData[i]) & 255;
  }
};

const defilterAverage = (rowData, bytesPerPixel, previousRowData) => {
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

export const defilter = (imageAndFilterData, width, bytesPerPixel) => {
  const rowSize = width * bytesPerPixel + 1;
  let filter;
  let currentRow;
  let previousRow;
  let firstDataByteIndex;

  for (let i = 0, n = imageAndFilterData.byteLength; i < n; i += rowSize) {
    filter = imageAndFilterData[i];
    firstDataByteIndex = i + 1;

    currentRow = imageAndFilterData.subarray(firstDataByteIndex, firstDataByteIndex + rowSize - 1);
    console.log('FILTER', filter);
    if (filter === 0) {
      console.log('filter is none', bytesPerPixel);
    }
    if (filter === 1) {
      console.log('filter is sub', bytesPerPixel);
      defilterSub(currentRow, bytesPerPixel);
    }
    if (filter === 2) {
      console.log('filter is up');
      defilterUp(currentRow, previousRow, i);
    }
    if (filter === 3) {
      console.log('filter is average!');
      defilterAverage(currentRow, bytesPerPixel, previousRow);
    }
    if (filter === 4) {
      console.log('filter is paeth!');
      defilterPaeth(currentRow, bytesPerPixel, previousRow);
    }

    imageAndFilterData[i] = 0;
    previousRow = currentRow.slice(0);
  }

  let s = '\n';
  for (let i=0, n = imageAndFilterData.byteLength; i < n; i++) {
    s += '|' + imageAndFilterData[i];
    if ((i + 1) % 4 === 0) {
      s += '\n';
    }
  }
  console.log(s);
}
