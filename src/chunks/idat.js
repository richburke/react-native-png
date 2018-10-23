import Chunk, { CHUNK_LENGTH_SIZE, CHUNK_HEADER_SIZE, CHUNK_CRC32_SIZE } from './chunk';
import { ColorTypes } from '../util/constants';

const HEADER = 'IDAT';
const DEFLATE_BLOCK_SIZE = 2;
const ZLIB_HEADER_SIZE = 5;
const ADLER_BASE  = 65521; // Largest prime smaller than 65536
const ADLER_NMAX = 5552;  // Largest n such that 255n(n + 1) / 2 + (n + 1)(_BASE - 1) <= 2^32 - 1
const ADLER_CHECKSUM_SIZE = 4;

export default class IDAT extends Chunk {
  constructor(options) {
    super(HEADER);
    
    this._width = options.width;
    this._height = options.height;
    this._colorType = options.colorType;
    this._numberOfPixels = options.numberOfPixels;

    /**
     * Have the following return a value, not set it within method.
     * Move to some PNG logic util.
     */
    this.determineSampleSize(this._colorType);
    this.determineHasAlpha(this._colorType);

    this._zlibLib = null;

    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
    // this.initializeDeflateBlockHeaders();
    const pixelAndFilterSize = this.calculatePixelAndFilterSize();
    this._pixelData = new Uint8ClampedArray(pixelAndFilterSize);
  }

  /**
   * @todo
   * Remove.  Just for testing
   */
  get pixels() {
    // This needs to be fixed to just return pixels
    return this._pixelData;
  }

  set width(value) {
    this._width = value;
  }

  set height(value) {
    this._height = value;
  }

  set colorType(value) {
    this._colorType = value;
  }

  set numberOfPixels(value) {
    this._numberOfPixels = value;
  }

  set maxNumberOfColors(value) {
    this._maxNumberOfColors = value;
  }

  initializeDeflateBlockHeaders() {
    const pixelAndFilterSize = this.calculatePixelAndFilterSize();

    for (let i = 0; (i << 16) - 1 < pixelAndFilterSize; i++) {
      console.log('calculating deflate...', i, (i << 16) - 1, i + 0xffff, pixelAndFilterSize);
      let size, bits;
      if (i + 0xffff < pixelAndFilterSize) {
        console.log('deflate less than')
        size = 0xffff;
        bits = 0x00;
        // bits = "\x00";

      } else {
        console.log('deflate greater than or equal')

        size = pixelAndFilterSize - (i << 16) - i;
        bits = 0x01;
        // bits = "\x01";

      }
      let offset = 8 + 2 + (i << 16) + (i << 2);
      offset = this.buffer.writeUint8At(offset, bits);
      offset = this.buffer.writeUint16At(offset, size, true);
      this.buffer.writeUint16At(offset, ~size, true);
      console.log('deflate headers, rnpng ->', 8 + 2 + (i << 16) + (i << 2), bits, size);
      // write(this.buffer, 8 + 2 + (i << 16) + (i << 2), bits, byte2lsb(size), byte2lsb(~size));
      // write(this.buffer, 8 + 2 + (i << 16) + (i << 2), bits, byte2lsb(size), byte2lsb(~size));
    }
  }

  determineSampleSize() {
    this._sampleSize = this._colorType === ColorTypes.GRAYSCALE ||
      this._colorType == ColorTypes.GRAYSCALE_AND_ALPHA ||
      this._colorType == ColorTypes.INDEXED ?
      1 :
      3;
    return this._sampleSize;
  }

  determineHasAlpha() {
    this._hasAlpha = this._colorType == ColorTypes.GRAYSCALE_AND_ALPHA ||
      this._colorType == ColorTypes.TRUECOLOR_AND_ALPHA ?
      true :
      false;
    return this._hasAlpha;
  }

  update() {
    const chunkSize = this.calculateChunkLength();
    const payloadSize = this.calculatePayloadSize();

    console.log('data size, rnpng ->', payloadSize);

    this.buffer.writeUint32(payloadSize);
    this.buffer.writeString8(HEADER);



    // let deflateHeader = ((8 + (7 << 4)) << 8) | (3 << 6);
    // deflateHeader += 31 - (deflateHeader % 31);
    // console.log('deflateHeader, rnpng ->', deflateHeader);
    // this.buffer.writeUint16(deflateHeader);

    // The default block headers have been initialized earlier.
    // Step over them.
    // this.buffer.stepOffset(ZLIB_HEADER_SIZE);
 
    const compressedPixelAndFilterData = this._zlibLib.deflate(this._pixelData);
    // const compressedPixelAndFilterData = this._zlibLib.deflate(this._pixelData);

    // console.log('compressed, again', compressedPixelAndFilterData)

    this.buffer.copyFrom(compressedPixelAndFilterData);

    // console.log();

    // this.buffer.copyFrom(this._pixelData);
    // deflate??
    // for (let i = 0, n = this._pixelData.length; i < n; i++) {
    //   // if (this._pixelData[i] !== 127) {
    //   //   console.log(i, this._pixelData[i]);
    //   // }
    //   this.buffer.writeUint8(this._pixelData[i]);
    // }

    // const adler32 = this.calculateAdler32();
    // this.buffer.writeUint32At(
    //   chunkSize - ADLER_CHECKSUM_SIZE - CHUNK_CRC32_SIZE,
    //   (adler32[1] << 16) | adler32[0]
    // );

    // console.log(this.buffer.bufferView);

    const crc = this.calculateCrc32();
    // console.log('IDAT CRC', crc);
    this.buffer.writeUint32At(chunkSize - CHUNK_CRC32_SIZE, crc);

    // console.log(
    //   HEADER + ' buffer',
    //   this.buffer.bufferView,
    //   this.buffer.asString()
    // );

    return this;
  }

  defilterSub(rowData, bytesPerPixel) {
    const rowSize = rowData.byteLength;
    let x;
    // console.log('rowSize', rowSize);
    for (let i = bytesPerPixel; i < rowSize; i++) {
      x = (rowData[i] + rowData[i - bytesPerPixel]) & 255;
      rowData[i] = x;
      // console.log('sub---', i, i - bytesPerPixel, x)
    }
  }

  defilterUp(rowData, previousRowData, rowIndex) {
    const rowSize = rowData.byteLength;
    let x;
    for (let i = 0; i < rowSize; i++) {
      // rowData[i] = previousRowData[i] & 255;
      // rowData[i] = (rowData[i] + previousRowData[i]) & 255;
      x = (rowData[i] + previousRowData[i]) & 255;
      // if (rowIndex < 10 * rowSize) {
      //   console.log(i, rowData[i], previousRowData[i], x)
      // }

      rowData[i] = x;
    }
  }

  /**
   * Not tested
   */
  defilterAverage(rowData, bytesPerPixel, previousRowData) {
    const rowSize = rowData.byteLength;
    for (let i = bytesPerPixel; i < rowSize; i++) {
      rowData[i] = Math.floor((rowData[i - bytesPerPixel] + previousRowData[i]) / 2) & 255;
    }
  }

  computePaeth(left, above, aboveLeft) {
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
  }

  defilterPaeth(rowData, bytesPerPixel, previousRowData) {
    // console.log('paeth', rowData);
    // console.log('paeth', previousRowData);
    // console.log('paeth--');
    const rowSize = rowData.byteLength;
    let previousPixelIndex;
    let left;
    let above;
    let aboveLeft;
    for (let i = 0; i < rowSize; i++) {
      // previousPixelIndex = Math.max(i - bytesPerPixel, 0);
      previousPixelIndex = i - bytesPerPixel;
      if (previousPixelIndex < 0) {
        left = 0;
        aboveLeft = 0;
      } else {
        left = rowData[previousPixelIndex];
        aboveLeft = typeof previousRowData === 'undefined' ? 0 : previousRowData[previousPixelIndex];
      }
      // left = rowData[previousPixelIndex];
      above = typeof previousRowData === 'undefined' ? 0 : previousRowData[i];
      // aboveLeft = typeof previousRowData === 'undefined' ? 0 : previousRowData[previousPixelIndex];
      // rowData[i] = 127;
      rowData[i] = (rowData[i] + this.computePaeth(left, above, aboveLeft)) & 255;
    }
  }

  /**
   * Move to a util
   * https://www.w3.org/TR/PNG-Filters.html
   */
  defilter(imageAndFilterData, width, bytesPerPixel) {
    const rowSize = width * bytesPerPixel + 1;
    let filter;
    let currentRow;
    let previousRow;
    let firstDataByteIndex;

    // console.log('IMAGE DATA', imageAndFilterData);



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
        this.defilterSub(currentRow, bytesPerPixel);
      }
      if (filter === 2) {
        console.log('filter is up');
        this.defilterUp(currentRow, previousRow, i);
      }
      if (filter === 3) {
        console.log('filter is average!');
        this.defilterAverage(currentRow, bytesPerPixel, previousRow);
      }
      if (filter === 4) {
        console.log('filter is paeth!');
        this.defilterPaeth(currentRow, bytesPerPixel, previousRow);
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

  load(abuf) {
    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
    // this.initializeDeflateBlockHeaders();
    // this.initializePixelData();

    // console.log('ABUF', abuf)

    // for (let x = 100; x < 122; x++) {
    //   abuf[x] = 220;
    // }

    // const pixelAndFilterSize = this.calculatePixelAndFilterSize();
    const dataOffset = this.calculateDataOffset();
    const compressedZlibData = abuf.subarray(dataOffset);

    // console.log('zlibData, compressed', compressedZlibData);
    // const uncompressedZlibData = this._zlibLib.inflate(compressedZlibData);
    this._pixelData = this._zlibLib.inflate(compressedZlibData);
    /*
     * compute bytesPerSample
     * compute bytesPerPixel
     */
    const bytesPerPixel = (this._sampleSize + 1) * 1;
    this.defilter(this._pixelData, this._width, bytesPerPixel);
    // console.log('zlibData, uncompressed', uncompressedZlibData);

 

    // console.log('zlibData, uncompressed', this._pixelData);

    // this._pixelData = uncompressedZlibData.subarray(7);

    // console.log('uncompress');

      // .subarray(DEFLATE_BLOCK_SIZE + ZLIB_HEADER_SIZE);
    // this._pixelData = new Uint8ClampedArray(abuf, dataOffset, pixelAndFilterSize);
    // this._pixelData = uncompressedPixelAndFilterData.byteLength));
    // console.log('pixelData, uncompressed ->>>', pixelAndFilterSize, this._pixelData.byteLength, this._pixelData);

    // console.log('uncompressed', uncompressedPixelAndFilterData);

    // this._pixelData.set(uncompressedPixelAndFilterData);

    // console.log('dataOffset', dataOffset);
    // console.log(abuf.subarray(dataOffset));
    // console.log(String.fromCharCode.apply(null, abuf.subarray(dataOffset)));
      // .set(abuf.subarray(dataOffset));

    // console.log(this._pixelData);
    // console.log(String.fromCharCode.apply(null, this._pixelData));
    // console.log('pixelData, inflated', );

    // console.log('PIXEL DATA', pixelAndFilterSize, this._pixelData.byteLength, abuf.byteLength);
    // this._pixelData[1010] = 0;
    // this._pixelData[1011] = 0;
    // this._pixelData[1012] = 0;
  }

  _setSingleValuePixel(index, value) {
    // if (index >= this._numberOfPixels * this._sampleSize) {
    //   console.log('problem index', index, value);
    //   throw new Error('Index out of range for pixels');
    // }
    this._pixelData[index] = value;
  }

  _setRgbPixel(index, pixel) {
    // console.log('index', index);
    this._pixelData[index++] = pixel[0]; // red
    this._pixelData[index++] = pixel[1]; // green
    this._pixelData[index++] = pixel[2]; // blue
  }

  setPixel(pos, pixel) {
    let index;
    if (Array.isArray(pos) && pos.length === 2) {
      index = this.translateXyToIndex(...pos);
    } else {
      index = pos;
    }

    // if (this._colorType === ColorTypes.GRAYSCALE ||
    //   this._colorType === ColorTypes.GRAYSCALE_AND_ALPHA ||
    //   this._colorType === ColorTypes.INDEXED) {
    if (Array.isArray(pixel)) {
      this._setRgbPixel(index, pixel);
    } else {
      this._setSingleValuePixel(index, pixel);
    }
    return this;
  }

  translateXyToIndex(x, y) {
    // var i = y * (this._width + 1) + x + 1;
    /**
     * Do I need to account for depth or colorType?
     */
    // console.log('x', x, 'y', y);
    return y * (this._width * this._sampleSize + 1) + (x * this._sampleSize) + 1;
    // return y * (this._width * this._sampleSize + 1) + x + 1;
    // return 8 + 2 + 5 * Math.floor((i / 0xffff) + 1) + i;
  }

  applyZlibLib(lib) {
    if (typeof lib.inflate !== 'function' || typeof lib.deflate !== 'function') {
      throw new Error('zlib library is missing required methods');
    }

    this._zlibLib = lib;
  }

  calculateDataOffset() {
    // return CHUNK_LENGTH_SIZE + CHUNK_HEADER_SIZE + DEFLATE_BLOCK_SIZE + ZLIB_HEADER_SIZE;
    return CHUNK_LENGTH_SIZE + CHUNK_HEADER_SIZE;
  }

  calculatePixelAndFilterSize() {
    return (this._numberOfPixels * this._sampleSize + 1) * this._height;
  }

  calculateAdler32() {
    let s1 = 1;
    let s2 = 0;
    let n = ADLER_NMAX;
  
    for (let y = 0; y < this._height; y++) {
      for (let x = -1; x < this._width; x++) {
        s1 = s1 + this._pixelData[this.translateXyToIndex(x, y)];
        s2 = s2 + s1;
        n = n - 1;
        if (n == 0) {
          s1 %= ADLER_BASE;
          s2 %= ADLER_BASE;
          n = ADLER_NMAX;
        }
      }
    }
    s1 = s1 % ADLER_BASE;
    s2 = s2 % ADLER_BASE;

    return [s1, s2];
  }

  calculatePayloadSize() {
    const pixelAndFilterSize = this.calculatePixelAndFilterSize();
    return 2  // Flags
      + pixelAndFilterSize  // Row filter and pixel data
      + 5 * Math.floor((0xfffe + pixelAndFilterSize) / 0xffff)  // Zlib blocks
      + 4;  // Adler checksum
  }

  calculateChunkLength() {
    return super.calculateChunkLength() + this.calculatePayloadSize();
  }
}
