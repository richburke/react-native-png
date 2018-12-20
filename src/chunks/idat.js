import Chunk, { CHUNK_CRC32_SIZE } from './chunk';
import {
  ChunkHeaderSequences,
  PixelLayouts,
} from '../util/constants';
import {
  isGrayscale,
  isIndexed,
  isGrayscaleWithAlpha,
  isTruecolorWithAlpha,
  hasAlphaSample,
  determineBytesPerPixel,
  determinePixelColorSize,
  determineFullPixelSize,
  determineDataRowLength,
  formatPixels,
} from '../util/png-pixels';
import {
  indexOfSequence,
  packByteData,
  unpackByteData,
  readUint32At,
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
    this._initializePixelData();

    this._should;
    this._hold;
  }

  getData(pixelLayout, pixelData, trnsData) {
    if (PixelLayouts.INDEX_VALUE === pixelLayout) {
      if (isIndexed(this._colorType)) {
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
    this._hasAlphaSample = hasAlphaSample(this._colorType);
  }

  update() {
    const chunkLength = this.calculateChunkLength();
    const payloadSize = this.calculatePayloadSize();

    this.initialize(chunkLength);
    this.buffer.writeUint32(payloadSize);
    this.buffer.writeString8(HEADER);

    const packedPixelData = Uint8ClampedArray.from(
      packByteData(this._pixelData, this._depth, !isIndexed(this._colorType))
    );

    const dataRowLength = determineDataRowLength(this._depth, this._colorType, this._width);
    const pixelAndFilterData = Uint8ClampedArray.from(
      addFilterFields(
        packedPixelData,
        dataRowLength,
        this._height
      )
    );

    const compressedPixelAndFilterData = this._zlibLib.deflate(pixelAndFilterData);
    this.buffer.copyFrom(compressedPixelAndFilterData);

    const crc = this.calculateCrc32();
    this.buffer.writeUint32At(chunkLength - CHUNK_CRC32_SIZE, crc);
  }

  load(abuf) {
    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);

    const payloadSize = readUint32At(abuf, 0);
    const dataOffset = this.calculateDataOffset();
    const compressedZlibData = abuf.subarray(dataOffset, dataOffset + payloadSize);
    const uncompressedData = this._zlibLib.inflate(compressedZlibData);

    const dataRowLength = determineDataRowLength(this._depth, this._colorType, this._width);
    const bytesPerPixel = determineBytesPerPixel(this._depth, this._colorType);

    defilter(uncompressedData, dataRowLength, bytesPerPixel);
    const pixelOnlyData = Uint8ClampedArray.from(
      removeFilterFields(
        uncompressedData,
        dataRowLength,
        this._height
      )
    );

    this._pixelData = Uint8ClampedArray.from(
      unpackByteData(pixelOnlyData, this._depth, !isIndexed(this._colorType))
    );
  }

  setPixelOf(index, pixel) {
    if (Array.isArray(pixel)) {
      this._setSamples(index, pixel);
      return this;
    }
    this._setSingleValuePixel(index, pixel);
  }

  setAlpha(index, value) {
    if (!isGrayscaleWithAlpha(this._colorType) && !isTruecolorWithAlpha(this._colorType)) {
      return;
    }
    this._setAlpha(index, value);
  }

  verify(bufView) {
    return indexOfSequence(bufView, ChunkHeaderSequences[HEADER]) !== -1;
  }

  applyZlibLib(lib) {
    this._zlibLib = lib;
  }

  getValueOf(index) {
    return this._pixelData[index];
  }

  getPixelOf(index) {
    /**
     * @todo
     * Need to check if there's a tRNS chunk
     */
    if (isGrayscale(this._colorType) || isIndexed(this._colorType)) {
      return [this.getValueOf(index)];
    }

    const fullPixelSize = determineFullPixelSize(this._colorType);
    if (index + fullPixelSize >= this._pixelData.length) {
      throw new Error('Trying to get a value beyond the range of pixel data');
    }

    const pixelData = [];
    for (let i = 0; i < fullPixelSize; i++) {
      pixelData.push(this.getValueOf(index + i));
    }
    return pixelData;
  }

  calculateDataSize() {
    const fullPixelSize = determineFullPixelSize(this._colorType);
    return this._width * fullPixelSize * this._height;
  }

  calculatePixelAndFilterSize() {
    return this.calculateDataSize() + this._height;
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

  _initializePixelData() {
    this._pixelData = new Uint8ClampedArray(this.calculateDataSize());
  }

  _setSingleValuePixel(index, value) {
    this._pixelData[index] = value;
  }

  _setAlpha(index, value) {
    this._pixelData[index + 3] = value; // alpha
  }

  _setSamples(startIndex, value) {
    value.forEach((sample, sampleIndex) => {
      this._pixelData[startIndex + sampleIndex] = sample;
    });
  }
}
