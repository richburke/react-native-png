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

    this.initialize(chunkLength);
    this.buffer.writeUint32(payloadSize);
    this.buffer.writeString8(HEADER);

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

    const crc = this.calculateCrc32();
    this.buffer.writeUint32(crc);
  }

  load(abuf) {
    const transparencyInfo = abuf.subarray(
      this.calculateDataOffset(),
      abuf.length - this.calculateDataOffset() - 4
    );

    console.log('loading tRNS', transparencyInfo);

    const suppliedLimit = readUint32At(abuf, 0);
    // const dataLimit = isTruecolor(this._colorType)
    //   ? transparencyInfo.length / 3
    //   : transparencyInfo.length;
    const dataLimit = transparencyInfo.length;
    const limit = Math.min(suppliedLimit, dataLimit);

    const samplesPerEntry = determineTransparencySamplesPerEntry(this._colorType);

    if (isTruecolor(this._colorType)) {
      for (let i = 0, n = 0; i < limit; i += samplesPerEntry, n += 1) {
        // let r = readUint8At(transparencyInfo, i, true);
        let r = readUint16At(transparencyInfo, i);
        // let g = readUint8At(transparencyInfo, i + 1, true);
        let g = readUint16At(transparencyInfo, i + 2);
        // let b = readUint8At(transparencyInfo, i + 2, true);
        let b = readUint16At(transparencyInfo, i + 4);
        this.setTransparency([r, g, b]);
      }
    } else if (isGrayscale(this._colorType)) {
      for (let i = 0, n = 0; i < limit; i += samplesPerEntry, n += 1) {
        this.setTransparency([readUint16At(transparencyInfo, i)]);
      }
    } else {
      for (let i = 0; i < limit; i += samplesPerEntry) {
        this.setTransparency([readUint8At(transparencyInfo, i)]);
      }
    }
  }

  /*
   * "The tRNS chunk specifies either alpha values that are associated with palette
   * entries (for indexed-colour images) or a single transparent colour (for greyscale 
   * and truecolour images)"
   */
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
    if (index >= this._numberOfPixels) {
      throw new Error('Attempting to set a opacity out of range of pixels');
    }

    if (!Array.isArray(colorData)) {
      colorData = [colorData];
    }

    if (isIndexed(this._colorType) && index > this._transparencies.length) {
      for (let i = this._transparencies.length; i < index; i++) {
        this._transparencies[i] = [255];
      }
    }

    if (-1 !== index) {
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
    return this._transparencies.length;
  }

  calculateChunkLength() {
    return super.calculateChunkLength() + this.calculatePayloadSize();
  }
}
