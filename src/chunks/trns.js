/*
 * "The tRNS chunk specifies either alpha values that are associated with palette
 * entries (for indexed-colour images) or a single transparent colour (for greyscale 
 * and truecolour images)"
 */

import Chunk from './chunk';
import {
  readUint8At,
  readUint16At,
  readUint32At
} from '../util/typed-array';
import {
  isGrayscale,
  isTruecolor,
  isIndexed,
  determineTransparencySamplesPerEntry,
  determineTransparencySpacePerSample,
  hashPixelData
} from '../util/png-pixels';

const HEADER = 'tRNS';

export default class tRNS extends Chunk {
  constructor(options) {
    super(HEADER);
    
    this._colorType = options.colorType;
    this._numberOfPixels = options.numberOfPixels;
    this._maxNumberOfColors = options.maxNumberOfColors;

    this._transparencies = [];

    this._hold;

    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
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

  update() {
    const chunkLength = this.calculateChunkLength();
    const payloadSize = this.calculatePayloadSize();

    console.log('PAYLOAD SIZE -->', payloadSize)

    this.initialize(chunkLength);
    this.buffer.writeUint32(payloadSize);
    this.buffer.writeString8(HEADER);

    console.log('updating tRNS, _transparencies', this._transparencies)

    if (isIndexed(this._colorType)) {
      for (let i = 0; i < this._transparencies.length; i++) {
        this.buffer.writeUint8('undefined' === typeof this._transparencies[i]
          ? 255
          : this._transparencies[i][0]
        ); 
      }
    } else {
      this._transparencies.forEach((transparency) => {
        transparency.forEach((transparencySampleValue) => {
          this.buffer.writeUint16(transparencySampleValue);
        });
      });
    }

    console.log('this is what tRNS should look like --->', this._hold);

    const crc = this.calculateCrc32();
    this.buffer.writeUint32(crc);
  }

  load(abuf) {
    /**
    const x = abuf.subarray(0, 18);
    console.log('tRNS ---', x);
    this._hold = x;
    */

    const suppliedLimit = readUint32At(abuf, 0);
    const transparencyInfo = abuf.subarray(
      this.calculateDataOffset(),
      this.calculateDataOffset() + suppliedLimit
    );

    console.log('loading tRNS', transparencyInfo);

    const samplesPerEntry = determineTransparencySamplesPerEntry(this._colorType);

    // console.log('transparency info', samplesPerEntry, transparencyInfo)
    if (isTruecolor(this._colorType)) {
      for (let i = 0; i < suppliedLimit;) {
        let r = readUint16At(transparencyInfo, i);
        i += 2;
        let g = readUint16At(transparencyInfo, i);
        i += 2;
        let b = readUint16At(transparencyInfo, i);
        i += 2;

        // console.log('trns r, g, b is', [r, g, b], i);
        this.setTransparency([r, g, b]);
      }
    } else if (isGrayscale(this._colorType)) {
      for (let i = 0, n = 0; i < suppliedLimit; i += samplesPerEntry, n += 1) {
        this.setTransparency([readUint16At(transparencyInfo, i)]);
      }
    } else {
      for (let i = 0; i < suppliedLimit; i += samplesPerEntry) {
        this.setTransparency([readUint8At(transparencyInfo, i)]);
      }
    }
  }

  getTransparencies() {
    if (isGrayscale(this._colorType) || isIndexed(this._colorType)) {
      return this._transparencies.reduce((acc, curr) => {
        return acc.concat(...curr);
      }, []);
    }
    return this._transparencies;
  }

  getIndexOf(colorData) {
    const hashedTestData = hashPixelData(colorData);
    for (let i = 0; i < this._transparencies.length; i++) {
      if (hashedTestData === hashPixelData(this._transparencies[i])) {
        return i;
      }
    }
    return -1;
  }

  getValueOf(index) {
    if (index >= this._numberOfPixels) {
      throw new Error('Attempting to get a transparency out of range of pixels');
    }

    return this._transparencies[index];
  }


  isTransparencySet(colorData) {
    return this.getIndexOf(colorData) !== -1;
  }

  /**
   * For indexed color types, the colorData supplied is the alpha value to be
   * associated with the associated palette color.  For the other relevant types
   * (Grayscale and Truecolor), colorData indicates the color, stashed in IDAT,
   * that should be considered transparent.
   */
  setTransparency(colorData, index = -1) {
    if (!Array.isArray(colorData)) {
      colorData = [colorData];
    }

    if (isIndexed(this._colorType) && index > this._transparencies.length) {
      /**
       * @todo
       * Confirm that index is within available palette indexes.
       * RnPng can do that.
       */
      for (let i = this._transparencies.length; i < index; i++) {
        this._transparencies[i] = [255];
      }
    } else {
      if (index >= this._numberOfPixels) {
        throw new Error('Attempting to set a transparency out of range of pixels');
      }
    }

    if (-1 !== index) {
      console.log('Setting transparency to ...', index, colorData);
      this._transparencies[index] = colorData;
      return index;
    }
    this._transparencies.push(colorData);
    return this._transparencies.length - 1;
  }

  /**
   * For grayscale and truecolor types
   */
  removeTransparency(colorData) {
    const index = this.getIndexOf(colorData);
    if (index !== -1) {
      this._transparencies.splice(index, 1);
    }
  }

  /**
   * For indexed color types
   */
  removeTransparencyOf(index) {
    if ('undefined' === typeof this._transparencies[index]) {
      throw new Error('Attempting to remove the transparency of an element that does not exist');
    }
    this._transparencies[index] = [255];
  }

  calculatePayloadSize() {
    const samplesPerEntry = determineTransparencySamplesPerEntry(this._colorType);
    const spacePerSample = determineTransparencySpacePerSample(this._colorType);
    return this._transparencies.length * samplesPerEntry * spacePerSample;
  }

  calculateChunkLength() {
    // return 18;
    return super.calculateChunkLength() + this.calculatePayloadSize();
  }
}
