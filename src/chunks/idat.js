import Chunk, { CHUNK_CRC32_SIZE } from './chunk';
import {
  ChunkHeaderSequences,
  ColorTypes,
  BitDepths,
  PixelLayouts,
} from '../util/constants';
import {
  determinePixelColorSize,
  determineHasAlphaSample,
  determineDataRowLength,
  formatPixels,
} from '../util/png-pixels';
import {
  indexOfSequence,
  packByteData,
  unpackByteData
} from '../util/typed-array';
import {
  defilter,
  addFilterFields,
  removeFilterFields,
} from '../util/compress-decompress';

const HEADER = 'IDAT';
const DEFLATE_BLOCKS_SIZE = 2;
const ZLIB_HEADER_SIZE = 5;
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
    const pixelAndFilterSize = this.calculatePixelAndFilterSize();
    this._pixelData = new Uint8ClampedArray(pixelAndFilterSize);
  }

  getData(pixelLayout, pixelData, trnsData) {
    if (PixelLayouts.INDEX_VALUE === pixelLayout) {
      if (ColorTypes.INDEXED !== this._colorType) {
        throw new Error('Attempt to get palette indices from a non-indexed image');
      } else {
        return pixelData;
      }
    }
    if (PixelLayouts.RGB === pixelLayout || PixelLayouts.RGBA === pixelLayout) {
      return formatPixels(this._colorType, this._width, this._height, pixelLayout, pixelData, trnsData);
    }
    return pixelData;
  }

  /**
   * Only for use by RnPng class.
   */
  get pixelData() {
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

  update() {
    const chunkSize = this.calculateChunkLength();
    const payloadSize = this.calculatePayloadSize();

    this.buffer.writeUint32(payloadSize);
    this.buffer.writeString8(HEADER);

    // console.log('updating -->', this._pixelData.length, this._height);

    /*
    differs by bit depth
    ? Math.ceil(this._pixelData / (8 / bit depth));
    */
    // const packedPixelData = new Uint8ClampedArray(128);
    console.log('packing data -->');
    const packedPixelData = Uint8ClampedArray.from(
      packByteData(this._pixelData, this._depth, ColorTypes.INDEXED !== this._colorType)
    );
    console.log('packed data -->', packedPixelData);
    // const packedPixelData = Uint8ClampedArray.from(this._pixelData);
    console.log('adding filter fields -->');
    // const pixelAndFilterData = new Uint8ClampedArray(packedPixelData.length + this._height);
    // this.prependFilterFields(packedPixelData, pixelAndFilterData, 4);

    let pixelAndFilterData;
    if (this._depth >= BitDepths.EIGHT && ColorTypes.INDEXED !== this._colorType) {
      pixelAndFilterData = Uint8ClampedArray.from(
        addFilterFields(
          packedPixelData,
          determineDataRowLength(this._depth, this._colorType, this._width),
          this._height
        )
      );
    } else {
      pixelAndFilterData = packedPixelData;
    }

    // console.log('deflating pixel data -->');
    const compressedPixelAndFilterData = this._zlibLib.deflate(pixelAndFilterData);
    this.buffer.copyFrom(compressedPixelAndFilterData);

    const crc = this.calculateCrc32();
    this.buffer.writeUint32At(chunkSize - CHUNK_CRC32_SIZE, crc);
  }

  load(abuf) {
    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);

    const dataOffset = this.calculateDataOffset();
    const compressedZlibData = abuf.subarray(dataOffset);

    const uncompressedData = this._zlibLib.inflate(compressedZlibData);
    const fullPixelSize = this._pixelColorSize + (this._hasAlphaSample ? 1 : 0);

    // console.log('uncompressed data -->', uncompressedData);

    let pixelOnlyData;
    if (this._depth >= BitDepths.EIGHT && ColorTypes.INDEXED !== this._colorType) {
      defilter(uncompressedData, this._width, fullPixelSize);
      pixelOnlyData = Uint8ClampedArray.from(
        removeFilterFields(
          uncompressedData,
          determineDataRowLength(this._depth, this._colorType, this._width),
          this._height
        )
      );
    } else {
      pixelOnlyData = uncompressedData;
    }

    // console.log('pixels only -->', pixelOnlyData);

    this._pixelData = Uint8ClampedArray.from(
      unpackByteData(pixelOnlyData, this._depth, ColorTypes.INDEXED !== this._colorType)
    );

    console.log('= --->', this._pixelData);
  }

  _setSingleValuePixel(index, value) {
    // if (index >= this._numberOfPixels * this._pixelSize) {
    //   console.log('problem index', index, value);
    //   throw new Error('Index out of range for pixels');
    // }
    this._pixelData[index] = value;
  }

  _setRgbPixel(index, pixel) {
    this._pixelData[index++] = pixel[0]; // red
    this._pixelData[index++] = pixel[1]; // green
    this._pixelData[index++] = pixel[2]; // blue
  }

  _setAlpha(index, value) {
    this._pixelData[index + 3] = value; // alpha
  }

  /**
   * @todo
   */
  setPixel(index, pixel) {
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

  setAlpha(index, value) {
    if (this._colorType !== ColorTypes.GRAYSCALE_AND_ALPHA &&
      this._colorType !== ColorTypes.TRUECOLOR_AND_ALPHA) {
        return;
    }

    this._setAlpha(index, value);
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

  calculatePayloadSize(pixelAndFilterSize = -1) {
    if (pixelAndFilterSize === -1) {
      pixelAndFilterSize = this.calculatePixelAndFilterSize();
    }
    return DEFLATE_BLOCKS_SIZE
      + pixelAndFilterSize  // Row filter and pixel data
      + ZLIB_HEADER_SIZE * Math.floor((0xfffe + pixelAndFilterSize) / 0xffff)  // Zlib blocks
      + ADLER_CHECKSUM_SIZE;
  }

  calculateChunkLength(payloadSize = -1) {
    if (payloadSize === -1) {
      payloadSize = this.calculatePayloadSize();
    }
    return super.calculateChunkLength() + payloadSize;
  }
}
