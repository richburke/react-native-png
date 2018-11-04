import Chunk from './chunk';
import {
  hashPixelData,
  hashPixelIndexKey,
  unhashPixelIndexKey
} from '../util/png-pixels';
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

  set maxNumberOfColors(value) {
    this._maxNumberOfColors = value;
  }

  update() {
    const payloadSize = this.calculatePayloadSize();

    this.buffer.writeUint32(payloadSize);
    this.buffer.writeString8(HEADER);

    const sorted = Object.entries(this._palette).sort((a, b) => 
      unhashPixelIndexKey(a[0]) - unhashPixelIndexKey(b[0]));

    console.log('sorted -->', sorted);

    for (let i = 0; i < sorted.length; i++) {
      let rgb = sorted[i][1];
      console.log('rgb', rgb)
      this.buffer.writeUint8(rgb[0]); 
      this.buffer.writeUint8(rgb[1]); 
      this.buffer.writeUint8(rgb[2]);
    }

    const crc = this.calculateCrc32();
    this.buffer.writeUint32(crc);
  }

  load(abuf) {
    const colorInfo = abuf.subarray(
      this.calculateDataOffset(),
      abuf.byteLength
    );

    const paletteSize = readUint32At(abuf, 0);
    if (0 !== paletteSize % SAMPLES_PER_ENTRY) {
      throw new Error('Invalid palette size supplied for PLTE chunk');
    }

    console.log('load PLTE', abuf)

    for (let i = 0, n = 0; i < paletteSize; i += SAMPLES_PER_ENTRY, n += 1) {
      this.setColorOf(n, [
        colorInfo[i],
        colorInfo[i + 1],
        colorInfo[i + 2],
      ]);
    }

    console.log('palette -->', paletteSize, this._palette);

    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
  }

  getPalette() {
    return Object.entries(this._palette).map((entry) => {
      return [unhashPixelIndexKey(entry[0]), entry[1]];
    });
  }

  isColorInPalette(colorData) {
    return this.getPaletteIndexOf(colorData) !== -1;
    // console.log('isColorInPalette', colorData);

    // const testColorKey = hashPixelData(colorData);
    // const paletteEntries = Object.entries(this._palette);

    // console.log('paletteEntries ->', testColorKey, paletteEntries);

    // for (let i = 0; i < paletteEntries.length; i++) {
    //   console.log('isColorInPalette ->', i, hashPixelData(paletteEntries[i][1]), paletteEntries[i]);

    //   if (testColorKey === hashPixelData(paletteEntries[i][1])) {
    //     return true;
    //   }
    // }
    // return false;
  }

  isIndexInPalette(index) {
    return 'undefined' !== typeof this._palette[hashPixelIndexKey(index)];
  }

  getCurrentNumberOfColors() {
    return Object.keys(this._palette).length;
  }

  getPaletteIndexOf(colorData) {
    console.log('getIndexOf', colorData);
    const testColorKey = hashPixelData(colorData);
    const paletteEntries = Object.entries(this._palette);

    console.log('paletteEntries ->', testColorKey, paletteEntries);


    for (let j = 0; j < paletteEntries.length; j++) {
      console.log('getIndexOf ->', hashPixelData(paletteEntries[j][1]));

      if (testColorKey === hashPixelData(paletteEntries[j][1])) {
        let x = unhashPixelIndexKey(paletteEntries[j][0]);
        return x;
        // return unhashPixelIndexKey(paletteEntries[j][0]);
      }
    }
    return -1;
  }

  getColorOf(index) {
    const x = this._palette[hashPixelIndexKey(index)];
    // console.log('get color of', index, x);
    return x;
  }

  getPixelPaletteIndices() {
    return Object.keys(this._palette).map((v) => Number(v)).sort((a, b) => a - b);
  }

  convertToPixels(paletteIndices) {
    let pixelData = new Uint8ClampedArray(paletteIndices.length * 3);
    let n = 0;

    // console.log('paletteEntries', paletteEntries);

    for (let i = 0; i < paletteIndices.length; i++) {
      let paletteIndex = paletteIndices[i];
      let pixel = this.getColorOf(paletteIndex);

      // console.log('pixel', pixel);
      if ('undefined' === typeof pixel || !Array.isArray(pixel) || 3 !== pixel.length) {
        throw new Error(`Problem retrieving pixel data for palette index ${paletteIndex}`);
      }
      pixelData[n++] = pixel[0];
      pixelData[n++] = pixel[1];
      pixelData[n++] = pixel[2];
    }

    return pixelData;
  }

  setColorOf(index, colorData) {
    if ('undefined' !== typeof this._palette[hashPixelIndexKey]) {
      if (this.getCurrentNumberOfColors() >= this._maxNumberOfColors) {
        throw new Error('Maximum number of colors reached');
      }
    }
    this._palette[hashPixelIndexKey(index)] = colorData;
  }

  replaceColor(oldColor, newColor) {
    if (!this.isColorInPalette(oldColor)) {
      throw new Error('Color to be replaced is not in palette');
    }

    const oldColorPaletteIndex = this.getPaletteIndexOf(oldColor);
    this._palette[hashPixelIndexKey(oldColorPaletteIndex)] = newColor;
  }


  calculatePayloadSize() {
    return Object.keys(this._palette).length * SAMPLES_PER_ENTRY;
  }

  calculateChunkLength() {
    return super.calculateChunkLength() + this.calculatePayloadSize();
  }
}
