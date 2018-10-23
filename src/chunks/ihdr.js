import Chunk, { CHUNK_LENGTH_SIZE, CHUNK_HEADER_SIZE } from './chunk';

const HEADER = 'IHDR';
const PAYLOAD_SIZE = 13;

export default class IDHR extends Chunk {
  constructor(options) {
    super(HEADER);
    
    this._width = options.width;
    this._height = options.height;
    this._depth = options.depth;
    this._colorType = options.colorType;
    this._compression = options.compression;
    this._filter = options.filter;
    this._interlace = options.interlace;

    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
  }

  update() {
    this.buffer.writeUint32(PAYLOAD_SIZE);
    this.buffer.writeString8(HEADER);
    this.buffer.writeUint32(this._width);
    this.buffer.writeUint32(this._height);
    this.buffer.writeUint8(this._depth);
    this.buffer.writeUint8(this._colorType);
    this.buffer.writeUint8(this._compression);
    this.buffer.writeUint8(this._filter);
    this.buffer.writeUint8(this._interlace);
    this.buffer.writeUint32(this.calculateCrc32());
  }

  load(abuf) {
    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
    /**
     * Why copy it into the buffer, why not just extract it.
     * It will be copied into buffer during update().
     */
    this.buffer.copyInto(abuf, chunkLength);
    this._extractMetaData();
  }

  _extractMetaData() {
    let offset = CHUNK_LENGTH_SIZE + CHUNK_HEADER_SIZE;

    const width = this.buffer.readUint32At(offset);
    offset += 4;
    const height = this.buffer.readUint32At(offset);
    offset += 4;
    const depth = this.buffer.readUint8At(offset);
    offset += 1;
    const colorType = this.buffer.readUint8At(offset);
    offset += 1;
    const compression = this.buffer.readUint8At(offset);
    offset += 1;
    const filter = this.buffer.readUint8At(offset);
    offset += 1;
    const interlace = this.buffer.readUint8At(offset);

    this._width = width;
    this._height = height;
    this._depth = depth;
    this._colorType = colorType;
    this._compression = compression;
    this._filter = filter;
    this._interlace = interlace;
  }

  calculateChunkLength() {
    return super.calculateChunkLength() + PAYLOAD_SIZE;
  }

  getMetaData() {
    return {
      width: this._width,
      height: this._height,
      depth: this._depth,
      colorType: this._colorType,
      compression: this._compression,
      filter: this._filter,
      interlace: this._interlace,
    };
  }
}
