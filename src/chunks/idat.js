import Chunk, { CHUNK_CRC32_SIZE } from './chunk';
import { ChunkHeaderSequences, ColorTypes, BitDepths } from '../util/constants';
import { determinePixelColorSize, determineHasAlphaSample } from '../util/pixels';
import { indexOfSequence, readUint32At } from '../util/typed-array';
import { defilter } from '../util/compress-decompress';

const HEADER = 'IDAT';
const DEFLATE_BLOCKS_SIZE = 2;
const ZLIB_HEADER_SIZE = 5;
const ADLER_BASE  = 65521; // Largest prime smaller than 65536
const ADLER_NMAX = 5552;  // Largest n such that 255n(n + 1) / 2 + (n + 1)(_BASE - 1) <= 2^32 - 1
const ADLER_CHECKSUM_SIZE = 4;

export default class IDAT extends Chunk {
  constructor(options) {
    super(HEADER);

    this.applyLayoutInformation({
      width: options.width,
      height: options.height,
      depth: options.depth,
      colorType: options.colorType,
      numberOfPixels: options.numberOfPixels,
    });

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

  applyLayoutInformation(info) {
    this._width = info.width;
    this._height = info.height;
    this._depth = info.depth;
    this._colorType = info.colorType;
    this._numberOfPixels = info.numberOfPixels;

    this._pixelColorSize = determinePixelColorSize(this._colorType);
    this._hasAlphaSample = determineHasAlphaSample(this._colorType);
  }

  /**
   * @todo
   * Move to a separate library, maybe something for all compression-decompression.
   */
  // initializeDeflateBlockHeaders() {
  //   const pixelAndFilterSize = this.calculatePixelAndFilterSize();

  //   for (let i = 0; (i << 16) - 1 < pixelAndFilterSize; i++) {
  //     console.log('calculating deflate...', i, (i << 16) - 1, i + 0xffff, pixelAndFilterSize);
  //     let size, bits;
  //     if (i + 0xffff < pixelAndFilterSize) {
  //       console.log('deflate less than')
  //       size = 0xffff;
  //       bits = 0x00;
  //       // bits = "\x00";

  //     } else {
  //       console.log('deflate greater than or equal')

  //       size = pixelAndFilterSize - (i << 16) - i;
  //       bits = 0x01;
  //       // bits = "\x01";

  //     }
  //     let offset = 8 + 2 + (i << 16) + (i << 2);
  //     offset = this.buffer.writeUint8At(offset, bits);
  //     offset = this.buffer.writeUint16At(offset, size, true);
  //     this.buffer.writeUint16At(offset, ~size, true);
  //     console.log('deflate headers, rnpng ->', 8 + 2 + (i << 16) + (i << 2), bits, size);
  //     // write(this.buffer, 8 + 2 + (i << 16) + (i << 2), bits, byte2lsb(size), byte2lsb(~size));
  //     // write(this.buffer, 8 + 2 + (i << 16) + (i << 2), bits, byte2lsb(size), byte2lsb(~size));
  //   }
  // }

  update() {
    const chunkLength = this.calculateChunkLength();
    const payloadSize = this.calculatePayloadSize();

    console.log('IDAT, calculated payload size', payloadSize);

    /**
     * @todo
     * Need to solve this space problem.  Use 
     * basn3p08
     * There shouldn't be all those empty values at the end.
     */
    const compressedPixelAndFilterData = this._zlibLib.deflate(this._pixelData);
    // const chunkLength = this.calculateChunkLength(compressedPixelAndFilterData.length + 12);
    this.initialize(chunkLength);

    this.buffer.writeUint32(payloadSize);
    this.buffer.writeString8(HEADER);

    this.buffer.copyFrom(compressedPixelAndFilterData);

    const crc = this.calculateCrc32();
    this.buffer.writeUint32At(chunkLength - CHUNK_CRC32_SIZE, crc);
  }

  load(abuf) {

        console.log('IDAT, on load', abuf);


    const dataOffset = this.calculateDataOffset();
    const dataSize = readUint32At(abuf, 0);
    const compressedZlibData = abuf.subarray(dataOffset);
    // const compressedZlibData = abuf.subarray(dataOffset, dataOffset + dataSize + 12);

    console.log('IDAT, dataSize', dataSize);
    // console.log('IDAT, compressed', compressedZlibData);

    this._pixelData = this._zlibLib.inflate(compressedZlibData);
    console.log('IDAT pixel color size', this._pixelColorSize);
    console.log('IDAT pixels', this._pixelData);

    /**
     * Need an alternate way to calculate chunk length
     */
    // const chunkLength = this.calculateChunkLength();
    // console.log('chunkLength', chunkLength);
    // this.initialize(chunkLength);


    if (this._depth < BitDepths.EIGHT || ColorTypes.INDEXED === this._colorType) {
    //   console.log('UNFILTER');

      return;  // Don
    }
      // ) {
    // if (ColorTypes.INDEXED !== this._colorType && this._bitDepth >= BitDepths.EIGHT) {
      const fullPixelSize = this._pixelColorSize + (this._hasAlphaSample ? 1 : 0);
      console.log('fullPixelSize', fullPixelSize, this._depth, this._colorType)

      defilter(this._pixelData, this._width, fullPixelSize);
      console.log('FILTER');
    // }

    /**
     * @todo
     * Convert to proper pixel array for bit depth
     * (160 - 32) * 8 * 4 = 4096
     * 160 = number of entries in source
     * 32 = number of filter bytes
     * 8 = number of bits in a byte
     * 1024 [not shown] = the number of elements in the pixel data array
     * 4 = number of samples per pixel
     * 4096 = the expected number when returning as .data
     */
    /**
        byte8 = byte & 1;
        byte7 = byte >> 1 & 1;
        byte6 = byte >> 2 & 1;
        byte5 = byte >> 3 & 1;
        byte4 = byte >> 4 & 1;
        byte3 = byte >> 5 & 1;
        byte2 = byte >> 6 & 1;
        byte1 = byte >> 7 & 1;
     */

    console.log('pixel data length', this._pixelData.length);
  }

  _setSingleValuePixel(index, value) {
    // if (index >= this._numberOfPixels * this._pixelSize) {
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

  /**
   * It's possible for a Truecolor and a Truecolor (2) with alpha (6) to
   * have paleltte indices as well, but that's not supported in this
   * implementation.
   */
  getPixelPaletteIndices() {
    if (this._colorType !== ColorTypes.INDEXED) {
      return [];
    }
    return new Set(Array.from(new Set(this._pixelData)).sort((a, b) => a - b));
  }

  translateXyToIndex(x, y) {
    const fullPixelSize = this._pixelColorSize + (this._hasAlphaSample ? 1 : 0);
    return y * (this._width * fullPixelSize + 1) + (x * fullPixelSize) + 1;
  }

  verify(bufView) {
    return indexOfSequence(bufView, ChunkHeaderSequences[HEADER]) !== -1;
  }

  applyZlibLib(lib) {
    if (typeof lib.inflate !== 'function' || typeof lib.deflate !== 'function') {
      throw new Error('zlib library is missing required methods');
    }

    this._zlibLib = lib;
  }

  calculatePixelAndFilterSize() {
    const fullPixelSize = this._pixelColorSize + (this._hasAlphaSample ? 1 : 0);
    return (this._width * fullPixelSize + 1) * this._height;
    // return (this._numberOfPixels * this._pixelSize + 1) * this._height;
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
    return DEFLATE_BLOCKS_SIZE
      + pixelAndFilterSize  // Row filter and pixel data
      + ZLIB_HEADER_SIZE * Math.floor((0xfffe + pixelAndFilterSize) / 0xffff)  // Zlib blocks
      + ADLER_CHECKSUM_SIZE;
  }

  calculateChunkLength(dataLength = -1) {
    if (dataLength !== -1) {
      return super.calculateChunkLength() + dataLength;
    }
    return super.calculateChunkLength() + this.calculatePayloadSize();
  }
}
