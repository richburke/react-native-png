import Chunk from './chunk';
import ArrayBufferWrapper from '../util/array-buffer-wrapper';

const PREFIX = '\x89PNG\r\n\x1A\n';

export default class Prefix extends Chunk {
  constructor() {
    super();
    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
  }

  update() {
    this.buffer.writeString8(PREFIX);
    return this;
  }

  verify(str) {
    const chunkLength = this.calculateChunkLength();
    return str.slice(0, chunkLength) === PREFIX;
  }

  calculateChunkLength = () => {
    return PREFIX.length;
  }
}
