import Chunk from './chunk';
import { ColorTypes, DEFAULT_TRANSPARENCY } from '../util/constants';

const HEADER = 'tRNS';

export default class tRNS extends Chunk {
  constructor(options) {
    super();
    
    this._colorType = options.colorType;
    this._numberOfPixels = options.numberOfPixels;
    this._maxNumberOfColors = options.maxNumberOfColors;

    const size = this._colorType === ColorTypes.INDEXED ?
      this._maxNumberOfColors :
      this._numberOfPixels;

    this._transparencies = new Uint8ClampedArray(size);
    for (let i = 0; i < size; i++) {
      this._transparencies[i] = 0;
      // this._transparencies[i] = DEFAULT_TRANSPARENCY;
    }

    const chunkLength = this.calculateChunkLength();
    super.initialize(chunkLength);
  }

  write() {
    const payloadSize = this.calculatePayloadSize();

    console.log('tRNS payload size', payloadSize);

    this.buffer.writeUint32(payloadSize);
    this.buffer.writeString8(HEADER);

    for (let i = 0; i < this._transparencies.length; i++) {
      this.buffer.writeUint8(this._transparencies[i]); 
    }

    const crc = this.calculateCrc32();
    console.log('tRNS CRC', crc);
    this.buffer.writeUint32(crc);

    console.log(
      HEADER + ' buffer',
      this.buffer.bufferView,
      this.buffer.asString()
    );

    return this;
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

