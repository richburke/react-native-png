import Chunk from './chunk';
import { ColorTypes } from '../util/constants';
import { readUint8At, readUint16At, readUint32At } from '../util/typed-array';
import { determineTransparencySamplesPerEntry } from '../util/png-pixels';

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

    if (ColorTypes.INDEXED === this._colorType) {
      for (let i = 0; i < this._transparencies.length; i++) {
        this.buffer.writeUint8('undefined' === typeof this._transparencies[i]
          ? 255
          : this._transparencies[i]
        ); 
      }
    } else {
      for (let i = 0; i < this._transparencies.length; i++) {
        this.buffer.writeUint16('undefined' === typeof this._transparencies[i]
          ? 255
          : this._transparencies[i]
        );
      }
    }

    const crc = this.calculateCrc32();
    this.buffer.writeUint32(crc);
  }

  load(abuf) {
    const transparencyInfo = abuf.subarray(
      this.calculateDataOffset(),
      abuf.byteLength
    );

    const suppliedLimit = readUint32At(abuf, 0);
    const dataLimit = ColorTypes.TRUECOLOR === this._colorType
      ? transparencyInfo.length - 2
      : transparencyInfo.length;
    const limit = Math.min(suppliedLimit, dataLimit);

    const samplesPerEntry = determineTransparencySamplesPerEntry(this._colorType);

    if (ColorTypes.TRUECOLOR === this._colorType) {
      for (let i = 0, n = 0; i < limit; i += samplesPerEntry, n += 1) {
        let r = readUint16At(transparencyInfo, i);
        let g = readUint16At(transparencyInfo, i + 2);
        let b = readUint16At(transparencyInfo, i + 4);
        this.setTransparency(n, [r, g, b]);
      }
    } else if (ColorTypes.GRAYSCALE === this._colorType) {
      for (let i = 0, n = 0; i < limit; i += samplesPerEntry, n += 1) {
        let luminousity = readUint16At(transparencyInfo, i);
        this.setTransparency(n, luminousity);
      }
    } else {
      for (let i = 0; i < limit; i += samplesPerEntry) {
        this.setTransparency(i, readUint8At(transparencyInfo, i));
      }
    }
  }

  getTransparencies() {
    const transparencies = new Uint8ClampedArray(this._numberOfPixels);
    for (let i = 0; i < this._transparencies.length; i++) {
      transparencies[i] = this._transparencies[i];
    }
    for (let i = this._transparencies.length; i < transparencies.length; i++) {
      transparencies[i] = 255;
    }
    return transparencies;
  }

  setTransparency(index, opacity) {
    const maxIndex = ColorTypes.GRAYSCALE !== this._colorType
      && ColorTypes.INDEXED !== this._colorType
      ? index + 2
      : index;

    if (maxIndex >= this._numberOfPixels) {
      throw new Error('Attempting to set a opacity out of range of pixels');
    }

    if (ColorTypes.GRAYSCALE === this._colorType || ColorTypes.INDEXED === this._colorType) {
      if (-1 !== index) {
        this._transparencies[index] = opacity;
      } else {
        this._transparencies.push(opacity);
      }
    } else {
      if (-1 !== index) {
        this._transparencies[index] = opacity[0];
        this._transparencies[index + 1] = opacity[1];
        this._transparencies[index + 2] = opacity[2];
      } else {
        this._transparencies.push(opacity[0]);
        this._transparencies.push(opacity[1]);
        this._transparencies.push(opacity[2]);
      }
    }
  }

  calculatePayloadSize() {
    return this._transparencies.length;
  }

  calculateChunkLength() {
    return super.calculateChunkLength() + this.calculatePayloadSize();
  }
}
