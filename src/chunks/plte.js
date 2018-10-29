import Chunk from './chunk';
import { hashPixelKey, unhashPixelKey } from '../util/pixels';
import { readUint32At } from '../util/typed-array';

const HEADER = 'PLTE';
const SAMPLES_PER_ENTRY = 3;

export default class PLTE extends Chunk {
  constructor(options) {
    super(HEADER);

    this._maxNumberOfColors = options.maxNumberOfColors;
    this._palette = {};

    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
  }

  get palette() {
    return this._palette;
  }

  set maxNumberOfColors(value) {
    this._maxNumberOfColors = value;
  }

  update() {
    const payloadSize = this.calculatePayloadSize();

    this.buffer.writeUint32(payloadSize);
    this.buffer.writeString8(HEADER);

    const sorted = Object.entries(this._palette).sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < sorted.length; i++) {
      let rgba = unhashPixelKey(sorted[i][0]);
      this.buffer.writeUint8(rgba[0]); 
      this.buffer.writeUint8(rgba[1]); 
      this.buffer.writeUint8(rgba[2]);
    }

    const crc = this.calculateCrc32();
    this.buffer.writeUint32(crc);
  }

  load(abuf) {
    // console.log('PLTE, on load', abuf);

    const colorInfo = abuf.subarray(
      this.calculateDataOffset(),
      abuf.byteLength
    );

    const paletteSize = readUint32At(abuf, 0);
    if (0 !== paletteSize % SAMPLES_PER_ENTRY) {
      throw new Error('Invalid palette size supplied for PLTE chunk');
    }

    for (let i = 0, n = 0; i < paletteSize; i += SAMPLES_PER_ENTRY, n += 1) {
      this.setColor([
        colorInfo[i],
        colorInfo[i + 1],
        colorInfo[i + 2],
      ], n, false);
    }

    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
  }

  /**
   * @todo
   */
  isColorInPalette(colorData) {
    let color;
    if (Array.isArray(colorData)) {
      color = convertRgbaToPaletteColor(...colorData);
    } else {
      color = String(colorData);
    }
    return this._palette.hasOwnProperty(color);
  }

  setColor(colorData, index = 0, checkExistence = true) {
    const color = hashPixelKey(colorData);

    if (checkExistence && this.isColorInPalette(color)) {
      return this._palette[color];
    }
    if (this.getCurrentNumberOfColors() >= this._maxNumberOfColors) {
      throw new Error('Maximum number of colors reached');
    }

    this._palette[color] = index;
    return this._palette[color];
  }

  swapColor(oldColor, newColor) {
    if (!this.isColorInPalette(oldColor)) {
      throw new Error('Color to be replaced is not in palette');
    }

    const value = this._palette[oldColor];
    this._palette[newColor] = value;
    delete this._palette[oldColor];
    return this;
  }

  // setBackgroundColor(colorData) {
  //   const color = convertRgbaToPaletteColor(...colorData);
  //   if (this.getCurrentNumberOfColors() < this._maxNumberOfColors) {
  //     this._palette[color] = 0;
  //   }
  //   this._isBackgroundSet = true;
  //   return this;
  // }

  getCurrentNumberOfColors() {
    let startCount = this._isBackgroundSet ? 1 : 0;
    return startCount + this._index;
  }

  /**
   * @todo
   */
  getColorIndex(colorData) {
    if (!this.isColorInPalette(colorData)) {
      return -1;
    }
    if (Array.isArray(colorData)) {
      return this._palette[convertRgbaToPaletteColor(...colorData)];
    }
    return this._palette[colorData];
  }

  /**
   * @todo
   * Remove, for testing only
   */
  getPixelPaletteIndices() {
    return new Set(Array.from(new Set(Object.values(this._palette))).sort((a, b) => a - b));
  }

  calculatePayloadSize() {
    console.log('palette length', Object.keys(this._palette).length);
    return Object.keys(this._palette).length * SAMPLES_PER_ENTRY;
  }

  calculateChunkLength() {
    return super.calculateChunkLength() + this.calculatePayloadSize();
  }
}
