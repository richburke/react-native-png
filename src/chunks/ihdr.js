import Chunk from './chunk';

const HEADER = 'IHDR';
const PAYLOAD_SIZE = 13;

export default class IDHR extends Chunk {
  constructor(options) {
    super();
    
    this._width = options.width;
    this._height = options.height;
    this._depth = options.depth;
    this._colorType = options.colorType;

    const chunkLength = this.calculateChunkLength();
    super.initialize(chunkLength);
  }

  write() {
    this.buffer.writeUint32(PAYLOAD_SIZE);
    this.buffer.writeString8(HEADER);
    this.buffer.writeUint32(this._width);
    this.buffer.writeUint32(this._height);
    this.buffer.writeUint8(this._depth);
    this.buffer.writeUint8(this._colorType);

    this.buffer.writeUint8(0);  // Compression
    this.buffer.writeUint8(0);  // Filter
    this.buffer.writeUint8(0);  // Interlace
/*
    const y = this.calculateCrc32();
    console.log('CRC for IHDR is', y);
*/
    this.buffer.writeUint32(this.calculateCrc32());
/*
    console.log('IHDR\'s buffer', this.buffer._bufferView)
    console.log('IHDR\'s buffer', this.buffer.asString())
*/
    return this;
  }

  calculateChunkLength() {
    return super.calculateChunkLength() + PAYLOAD_SIZE;
  }
}
