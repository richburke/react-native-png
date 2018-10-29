import Chunk from './chunk';
import { ColorTypes } from '../util/constants';
import { readUint32At } from '../util/typed-array';
import { determineTransparencySamplesPerEntry } from '../util/pixels';

const HEADER = 'tRNS';

/**
 * Handle different types
 * https://www.w3.org/TR/PNG-Chunks.html
 * - 3, stores in 1 byte
 * - 2, stores in 2 bytes with 3 samples
 */

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

  get transparencies() {
    return this._transparencies;
  }
  
  update() {
    const payloadSize = this.calculatePayloadSize();

    this.buffer.writeUint32(payloadSize);
    this.buffer.writeString8(HEADER);

    for (let i = 0; i < this._transparencies.length; i++) {
      this.buffer.writeUint8(this._transparencies[i]); 
    }

    const crc = this.calculateCrc32();
    this.buffer.writeUint32(crc);

    // console.log('tRNS should look like this', [
    //   255, 0, 229, 183, 48, 74, 0, 0, 0, 21, 73, 68, 65, 84, 120, 218, 98, 96, 160, 1, 96, 132, 2, 106, 241, 169, 8, 0, 2, 12, 0, 19, 156, 0, 41, 219, 2, 128, 135, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    // ]);
    console.log('tRNS looks like this', this.buffer.bufferView);
  }

  load(abuf) {
    const transparencyInfo = abuf.subarray(
      this.calculateDataOffset(),
      abuf.byteLength
    );

    const suppliedLimit = readUint32At(abuf, 0);
    const dataLimit = ColorTypes.TRUECOLOR === this._colorType
      ? transparencyInfo.length - 2
      : transparencyInfo.length
    const limit = Math.min(suppliedLimit, dataLimit);

    const samplesPerEntry = determineTransparencySamplesPerEntry(this._colorType);

    if (ColorTypes.TRUECOLOR === this._colorType) {
      for (let i = 0, n = 0; i < limit; i += samplesPerEntry, n += 1) {
        this.setTransparency([
          transparencyInfo[i],
          transparencyInfo[i + 1],
          transparencyInfo[i + 2],
        ], n);
      }
    } else {
      for (let i = 0; i < limit; i += samplesPerEntry) {
        this.setTransparency(transparencyInfo[i]);
      }
    }

    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);

    // console.log('tRNS', abuf);
    // console.log('tRNS', transparencyInfo);
    // console.log('tRNS', this._transparencies);
  }

  setTransparency(alpha, index = -1) {
    /**
     * @todo
     * - Differs by type
     */
    if (-1 !== index && index > this._transparencies.length - 1) {
      this._transparencies[index] = alpha;
    }
    this._transparencies.push(alpha);
  }

  calculatePayloadSize() {
    return this._transparencies.length;
  }

  calculateChunkLength() {
    return super.calculateChunkLength() + this.calculatePayloadSize();
  }
}
