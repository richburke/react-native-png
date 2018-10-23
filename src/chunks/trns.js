import Chunk from './chunk';
import { ColorTypes, DEFAULT_TRANSPARENCY } from '../util/constants';

const HEADER = 'tRNS';

export default class tRNS extends Chunk {
  constructor(options) {
    super(HEADER);
    
    this._colorType = options.colorType;
    this._numberOfPixels = options.numberOfPixels;
    this._maxNumberOfColors = options.maxNumberOfColors;

    const size = this._colorType === ColorTypes.INDEXED ?
      this._maxNumberOfColors :
      this._numberOfPixels;

    this._transparencies = new Uint8ClampedArray(size);
    for (let i = 0; i < size; i++) {
      // this._transparencies[i] = 0;
      this._transparencies[i] = DEFAULT_TRANSPARENCY;
    }

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
    const payloadSize = this.calculatePayloadSize();

    this.buffer.writeUint32(payloadSize);
    this.buffer.writeString8(HEADER);

    for (let i = 0; i < this._transparencies.length; i++) {
      this.buffer.writeUint8(this._transparencies[i]); 
    }

    const crc = this.calculateCrc32();
    this.buffer.writeUint32(crc);

    return this;
  }

  load(abuf) {
    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
    this.buffer.copyInto(abuf, chunkLength);

    /**
     * @todo
     * Loop through values and add them to transparencies
     */
    // setTransparency()
  }

  setTransparency(index, alpha) {
    if (index >= this._transparencies.length) {
      throw new Error('Index out of range for transparencies');
    }
    this._transparencies[index] = alpha;
    return this;
  }

  calculatePayloadSize() {
    return this._transparencies.length;
  }

  calculateChunkLength() {
    return super.calculateChunkLength() + this.calculatePayloadSize();
  }

  get transparencies() {
    return this._transparencies;
  }
}
