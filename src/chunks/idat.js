import Chunk, { CHUNK_CRC32_SIZE } from './chunk';
import {
  ChunkHeaderSequences,
  BitDepths,
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

    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
    const pixelAndFilterSize = this.calculatePixelAndFilterSize();
    this._pixelData = new Uint8ClampedArray(pixelAndFilterSize);

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
    console.log('packing data -->', this._pixelData);
    const packedPixelData = Uint8ClampedArray.from(
      packByteData(this._pixelData, this._depth, !isIndexed(this._colorType))
    );
    // const packedPixelData = this._hold;
    console.log('packed data -->!!!', packedPixelData);
    // const packedPixelData = Uint8ClampedArray.from(this._pixelData);
    console.log('adding filter fields -->');
    // const pixelAndFilterData = new Uint8ClampedArray(packedPixelData.length + this._height);
    // this.prependFilterFields(packedPixelData, pixelAndFilterData, 4);

    // let pixelAndFilterData;
    // if (this._depth >= BitDepths.EIGHT && !isIndexed(this._colorType)) {
    //   pixelAndFilterData = Uint8ClampedArray.from(
    //     addFilterFields(
    //       packedPixelData,
    //       determineDataRowLength(this._depth, this._colorType, this._width),
    //       this._height
    //     )
    //   );
    // } else {
      const dataRowLength = determineDataRowLength(this._depth, this._colorType, this._width);
      const pixelAndFilterData = Uint8ClampedArray.from(
        addFilterFields(
          packedPixelData,
          // 8,
          dataRowLength,
          this._height
        )
      );
      // pixelAndFilterData = packedPixelData;
    // }

    // console.log('deflating pixel data -->', this._hold);
    // const compressedPixelAndFilterData = this._zlibLib.deflate(this._hold);
    const compressedPixelAndFilterData = this._zlibLib.deflate(pixelAndFilterData);
    console.log('deflating pixel data, length ...-->', compressedPixelAndFilterData);

    console.log('This is what IDAT should look like -->', this._should)

    console.log('this is what IDAT would look like -->', compressedPixelAndFilterData);

    // this.buffer.copyFrom(this._should);
    this.buffer.copyFrom(compressedPixelAndFilterData);

    const crc = this.calculateCrc32();
    this.buffer.writeUint32At(chunkSize - CHUNK_CRC32_SIZE, crc);

    // this.buffer.copyFrom(this._hold);
  }

  load(abuf) {
    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);

    const payloadSize = readUint32At(abuf, 0);
    const dataOffset = this.calculateDataOffset();
    const compressedZlibData = abuf.subarray(dataOffset, dataOffset + payloadSize);

    this._should = compressedZlibData;

    // const compressedZlibData = abuf.subarray(dataOffset, dataOffset + 91);

    const uncompressedData = this._zlibLib.inflate(compressedZlibData);

    console.log('uncompressed data -->', uncompressedData);

    const dataRowLength = determineDataRowLength(this._depth, this._colorType, this._width);
    const bytesPerPixel = determineBytesPerPixel(this._depth, this._colorType);
    // let pixelOnlyData;
    // if (this._depth >= BitDepths.EIGHT && !isIndexed(this._colorType)) {
    //   defilter(uncompressedData, this._width, fullPixelSize);
    //   pixelOnlyData = Uint8ClampedArray.from(
    //     removeFilterFields(
    //       uncompressedData,
    //       determineDataRowLength(this._depth, this._colorType, this._width),
    //       this._height
    //     )
    //   );
    // } else {
    //   // ?? merge
      defilter(uncompressedData, dataRowLength, bytesPerPixel);
    const pixelOnlyData = Uint8ClampedArray.from(
        removeFilterFields(
          uncompressedData,
          // 8,
          dataRowLength,
          this._height
        )
      );
      // pixelOnlyData = uncompressedData;
    // }

    // this._hold = pixelOnlyData;

    console.log('uncompressed data is now', uncompressedData);

    this._hold = pixelOnlyData;


    // width / pixelsPerByte
    // 32 / 4

    console.log('pixels only -->', pixelOnlyData);

    this._pixelData = Uint8ClampedArray.from(
      unpackByteData(pixelOnlyData, this._depth, !isIndexed(this._colorType))
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

  // _setRgbPixel(index, pixel) {
  //   this._pixelData[index++] = pixel[0]; // red
  //   this._pixelData[index++] = pixel[1]; // green
  //   this._pixelData[index++] = pixel[2]; // blue
  // }

  // _setRgbaPixel(index, pixel) {
  //   this._pixelData[index++] = pixel[0]; // red
  //   this._pixelData[index++] = pixel[1]; // green
  //   this._pixelData[index++] = pixel[2]; // blue
  //   this._pixelData[index++] = pixel[3]; // alpha
  // }

  _setAlpha(index, value) {
    this._pixelData[index + 3] = value; // alpha
  }

  _setSamples(startIndex, value) {
    value.forEach((sample, sampleIndex) => {
      this._pixelData[startIndex + sampleIndex] = sample;
    });
  }

  setPixelOf(index, pixel) {
    if (Array.isArray(pixel)) {
      this._setSamples(index, pixel);
      return this;
    }
    // pixel.forEach((sample, sampleIndex) => {
    //   this._pixelData[index + sampleIndex] = sample;
    // });
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
    if (typeof lib.inflate !== 'function' || typeof lib.deflate !== 'function') {
      throw new Error('zlib library is missing required methods');
    }

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

  calculatePixelAndFilterSize() {
    const fullPixelSize = determineFullPixelSize(this._colorType);
    return (this._width * fullPixelSize + 1) * this._height;
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
    // return 32;
    if (payloadSize === -1) {
      payloadSize = this.calculatePayloadSize();
    }
    return super.calculateChunkLength() + payloadSize;
  }
}
