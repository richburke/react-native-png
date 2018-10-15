import Chunk from './chunk';

const PREFIX = '\x89PNG\r\n\x1A\n';

export default class Prefix extends Chunk {
  constructor() {
    super();
    const chunkLength = this.calculateChunkLength();
    super.initialize(chunkLength);
  }

  write() {
    this.buffer.writeString8(PREFIX);
    console.log('prefix\'s buffer', this.buffer.asString(), this.buffer.asString().length)
    return this;
  }

  calculateChunkLength() {
    return PREFIX.length;
  }
}
