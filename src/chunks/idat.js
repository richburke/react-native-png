import Chunk, { CHUNK_CRC32_SIZE } from './chunk';
import { ColorTypes } from '../util/constants';

const HEADER = 'IDAT';
const ADLER_BASE  = 65521; // Largest prime smaller than 65536
const ADLER_NMAX = 5552;  // Largest n such that 255n(n + 1) / 2 + (n + 1)(_BASE - 1) <= 2^32 - 1
const ADLER_CHECKSUM_SIZE = 4;

export default class IDAT extends Chunk {
  constructor(options) {
    super();
    
    this._width = options.width;
    this._height = options.height;
    this._colorType = options.colorType;
    this._numberOfPixels = options.numberOfPixels;
    this._numberOfChannels = this._colorType === ColorTypes.GRAYSCALE ||
      this._colorType == ColorTypes.GRAYSCALE_AND_ALPHA ||
      this._colorType == ColorTypes.INDEXED ?
      1 :
      3;

    /*
    Should just be pixels. Wrap pixels in filter and adler checksum
    on update.
    */
    const size = this.calculatePixelAndFilterSize();
    this._pixelData = new Uint8ClampedArray(size);
    // Initialize with 0 values
    for (let i = 0; i < size; i++) {
      this._pixelData[i] = 0;
    }
   
    const chunkLength = this.calculateChunkLength();
    super.initialize(chunkLength);

    this.initializeDeflateBlockHeaders();
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

  write() {
    const chunkSize = this.calculateChunkLength();
    const payloadSize = this.calculatePayloadSize();

    console.log('data size, rnpng ->', payloadSize);

    this.buffer.writeUint32(payloadSize);
    this.buffer.writeString8(HEADER);

    let deflateHeader = ((8 + (7 << 4)) << 8) | (3 << 6);
    deflateHeader += 31 - (deflateHeader % 31);
    console.log('deflateHeader, rnpng ->', deflateHeader);
    this.buffer.writeUint16(deflateHeader);

    this.buffer.stepOffset(5); // Why?
    // A: Because the default block headers have been initialized
    // earlier at this point.
    
    for (let i = 0, n = this._pixelData.length; i < n; i++) {
      this.buffer.writeUint8(this._pixelData[i]);
    }

    const adler32 = this.calculateAdler32();
    this.buffer.writeUint32At(
      chunkSize - ADLER_CHECKSUM_SIZE - CHUNK_CRC32_SIZE,
      (adler32[1] << 16) | adler32[0]
    );

    const crc = this.calculateCrc32();
    console.log('IDAT CRC', crc);
    this.buffer.writeUint32At(chunkSize - CHUNK_CRC32_SIZE, crc);

    console.log(
      HEADER + ' buffer',
      this.buffer.bufferView,
      this.buffer.asString()
    );

    return this;
  }

  _setSingleValuePixel(index, value) {
    if (index >= this._numberOfPixels) {
      throw new Error('Index out of range for pixels');
    }
    this._pixelData[index] = value;
  }

  _setRgbPixel(index, pixel) {
    const { red, green, blue } = pixel;

    this._pixelData[index] = red;
    index += 1;
    this._pixelData[index] = green;
    index += 1;
    this._pixelData[index] = blue;
    index += 1;

    return index;
  }

  setPixel(pos, pixel) {
    if (Array.isArray(pos) && pos.length === 2) {
      index = this.translateXyToIndex(...pos);
    } else {
      index = pos;
    }

    if (this._colorType === ColorTypes.GRAYSCALE ||
      this._colorType === ColorTypes.GRAYSCALE_AND_ALPHA ||
      this._colorType === ColorTypes.INDEXED) {
        this._setSingleValuePixel(index, pixel);
    } else {
      this._setRgbPixel(index, pixel);
    }
    return this;
  }

  translateXyToIndex(x, y) {
    // var i = y * (this._width + 1) + x + 1;
    return y * (this._width + 1) + x + 1;
    // return 8 + 2 + 5 * Math.floor((i / 0xffff) + 1) + i;
  }

  calculatePixelAndFilterSize() {
    return (this._numberOfPixels * this._numberOfChannels) + this._height;
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
          s2%= ADLER_BASE;
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

  get pixels() {
    // This needs to be fixed to just return pixels
    return this._pixels;
  }
}

