import Chunk from './chunk';

const HEADER = 'IEND';
const PAYLOAD_SIZE = 0;

export default class IEND extends Chunk {
  constructor() {
    super();
    const chunkLength = this.calculateChunkLength();
    super.initialize(chunkLength);
  }

  write() {
    this.buffer.writeUint32(PAYLOAD_SIZE);
    this.buffer.writeString8(HEADER)
    this.buffer.writeUint32(this.calculateCrc32());
    return this;
  }
}
