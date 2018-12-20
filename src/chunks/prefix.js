import Chunk from './chunk';
import { indexOfSequence } from '../util/typed-array';

const PREFIX = '\x89PNG\r\n\x1A\n';
const VERIFY_SEQUENCE = [137, 80, 78, 71];

export default class Prefix extends Chunk {
  constructor() {
    super();
    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
  }

  update() {
    this.buffer.writeString8(PREFIX);
  }

  verify(bufView) {
    return indexOfSequence(bufView, VERIFY_SEQUENCE, 0, this.calculateChunkLength()) !== -1;
  }

  calculateChunkLength() {
    return PREFIX.length;
  }
}
