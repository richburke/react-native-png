import Chunk from './chunk';

const HEADER = 'IEND';
const PAYLOAD_SIZE = 0;

export default class IEND extends Chunk {
  constructor() {
    super(HEADER);

    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
  }

  update() {
    this.buffer.writeUint32(PAYLOAD_SIZE);
    this.buffer.writeString8(HEADER)
    this.buffer.writeUint32(this.calculateCrc32());
    return this;
  }

  load(abuf) {
    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
    this.buffer.copyInto(abuf, chunkLength);
  }
}
