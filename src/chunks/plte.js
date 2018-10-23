import Chunk from './chunk';
import { convertRgbaToPaletteColor, convertPaletteColorToRgba } from '../util/pixels';

const HEADER = 'PLTE';

export default class PLTE extends Chunk {
  constructor(options) {
    super(HEADER);

    this._maxNumberOfColors = options.maxNumberOfColors;
    this._palette = {};
    this._index = 1;
    this._isBackgroundSet = false;

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
      let rgba = convertPaletteColorToRgba(sorted[i][0]);
      this.buffer.writeUint8(rgba[0]); 
      this.buffer.writeUint8(rgba[1]); 
      this.buffer.writeUint8(rgba[2]); 
    }

    // Remove this when done.
    // Palettes need not have the full amount of entries
    for (let i = sorted.length; i < this._maxNumberOfColors; i++) {
      this.buffer.writeUint8(0); 
      this.buffer.writeUint8(0); 
      this.buffer.writeUint8(0); 
    }

    const crc = this.calculateCrc32();
    this.buffer.writeUint32(crc);
  }

  load(abuf) {
    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
    this.buffer.copyInto(abuf, chunkLength);

    /**
     * @todo
     * Loop through colors and add them to palette.
     */
    // addColor()
  }

  isColorInPalette(colorData) {
    let color;
    if (Array.isArray(colorData)) {
      color = convertRgbaToPaletteColor(...colorData);
    } else {
      color = colorData;
    }
    return this._palette.hasOwnProperty(color);
  }

  addColor(colorData) {
    const color = convertRgbaToPaletteColor(...colorData);

    if (this.isColorInPalette(color)) {
      return this._palette[color];
    }
    if (this.getCurrentNumberOfColors() >= this._maxNumberOfColors) {
      throw new Error('Maximum number of colors reached');
    }

    const currentIndex = this._index;
    this._palette[color] = currentIndex;
    this._index += 1;

    return this._palette[color];
  }

  // setColor(colorData, sampleIndex) {
  //   if (this.getCurrentNumberOfColors() >= this._maxNumberOfColors) {
  //     return undefined;
  //   }

  //   console.log('COLOR DATA', ...colorData)
  //   const color = createRgbaPaletteColor(...colorData);
  //   this._palette[color] = sampleIndex;
  //   return sampleIndex;
  // }

  swapColor(oldColor, newColor) {
    if (!this.isColorInPalette(oldColor)) {
      throw new Error('Color to be replaced is not in palette');
    }

    const value = this._palette[oldColor];
    this._palette[newColor] = value;
    delete this._palette[oldColor];
    return this;
  }

  setBackgroundColor(colorData) {
    const color = convertRgbaToPaletteColor(...colorData);
    if (this.getCurrentNumberOfColors() < this._maxNumberOfColors) {
      this._palette[color] = 0;
    }
    this._isBackgroundSet = true;
    return this;
  }

  getCurrentNumberOfColors() {
    let startCount = this._isBackgroundSet ? 1 : 0;
    return startCount + this._index;
  }

  getColorIndex(colorData) {
    if (!this.isColorInPalette(colorData)) {
      return -1;
    }
    if (Array.isArray(colorData)) {
      return this._palette[convertRgbaToPaletteColor(...colorData)];
    }
    return this._palette[colorData];
  }

  calculatePayloadSize() {
    // Update to the number of entries.
    return this._maxNumberOfColors * 3;
  }

  calculateChunkLength() {
    return super.calculateChunkLength() + this.calculatePayloadSize();
  }
}
