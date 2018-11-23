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

    // const chunkLength = this.calculateChunkLength();
    // this.initialize(chunkLength);
  }

  set maxNumberOfColors(value) {
    this._maxNumberOfColors = value;
  }

  update() {
    const chunkLength = this.calculateChunkLength();
    const payloadSize = this.calculatePayloadSize();

    this.initialize(chunkLength);
    this.buffer.writeUint32(payloadSize);
    this.buffer.writeString8(HEADER);

    const sorted = Object.entries(this._palette).sort((a, b) => 
      unhashPixelIndexKey(a[0]) - unhashPixelIndexKey(b[0]));

    console.log('sorted -->', sorted);

    for (let i = 0; i < sorted.length; i++) {
      let rgb = sorted[i][1];
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

    /**
     * @todo
     * Can I move this above and just get the stuff I need?
     */
    const paletteSize = readUint32At(abuf, 0);
    if (0 !== paletteSize % SAMPLES_PER_ENTRY) {
      throw new Error('Invalid palette size supplied for PLTE chunk');
    }

    console.log('load PLTE', abuf)

    // for (let i = 0; i < colorInfo.length; i += SAMPLES_PER_ENTRY) {
    for (let i = 0; i < paletteSize; i += SAMPLES_PER_ENTRY) {
      this.addColor([
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
    return this.getPaletteIndex(colorData) !== -1;
  }

  isIndexInPalette(index) {
    return 'undefined' !== typeof this._palette[hashPixelIndexKey(index)];
  }

  getCurrentNumberOfColors() {
    return Object.keys(this._palette).length;
  }

  getPaletteIndex(colorData) {
    console.log('getIndexOf', colorData);
    const testColorKey = hashPixelData(colorData);
    const paletteEntries = Object.entries(this._palette);

    console.log('paletteEntries ->', testColorKey, paletteEntries);


    for (let j = 0; j < paletteEntries.length; j++) {
      // console.log('getIndexOf ->', hashPixelData(paletteEntries[j][1]));

      if (testColorKey === hashPixelData(paletteEntries[j][1])) {
        let x = unhashPixelIndexKey(paletteEntries[j][0]);
        console.log('found palette index', x);
        return x;
        // return unhashPixelIndexKey(paletteEntries[j][0]);
      }
    }
    return -1;
  }

  getColorOf(index) {
    return this._palette[hashPixelIndexKey(index)];
  }

  getPixelPaletteIndices() {
    return Object.keys(this._palette).map((v) => Number(v)).sort((a, b) => a - b);
  }

  convertToPixels(paletteIndices) {
    let pixelData = new Uint8ClampedArray(paletteIndices.length * 3);
    let n = 0;

    // console.log('paletteEntries', paletteEntries);

    console.log('paletteIndices', paletteIndices)
    console.log(this.getPalette())

    for (let i = 0; i < paletteIndices.length; i++) {
      let paletteIndex = paletteIndices[i];
      let pixel = this.getColorOf(paletteIndex);

      // console.log('found pixel', pixel);

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
    // console.log('setColorOf()', index, colorData);

    const hashedIndex = hashPixelIndexKey(index);
    if ('undefined' === typeof this._palette[hashedIndex]
      && this.getCurrentNumberOfColors() >= this._maxNumberOfColors) {
        throw new Error('Maximum number of colors reached');
    }
    this._palette[hashedIndex] = colorData;
    return index;
  }

  addColor(colorData) {
    if (this.getCurrentNumberOfColors() >= this._maxNumberOfColors) {
      throw new Error('Maximum number of colors reached');
    }
    const index = Object.keys(this._palette).length;
    return this.setColorOf(index, colorData);
  }

  replaceColor(oldColor, newColor) {
    if (!this.isColorInPalette(oldColor)) {
      throw new Error('Color to be replaced is not in palette');
    }

    const oldColorPaletteIndex = this.getPaletteIndex(oldColor);
    this._palette[hashPixelIndexKey(oldColorPaletteIndex)] = newColor;
  }


  calculatePayloadSize() {
    return Object.keys(this._palette).length * SAMPLES_PER_ENTRY;
  }

  calculateChunkLength() {
    return super.calculateChunkLength() + this.calculatePayloadSize();
  }
}
