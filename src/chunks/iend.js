import Chunk, { CHUNK_LENGTH_SIZE } from './chunk';
import { ChunkHeaderSequences } from '../util/constants';
import { indexOfSequence } from '../util/typed-array';

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
    this.buffer.writeString8(HEADER);
    this.buffer.writeUint32(this.calculateCrc32());
  }

  verify(bufView) {
    return indexOfSequence(bufView, ChunkHeaderSequences[HEADER], bufView.byteLength - this.calculateChunkLength() + CHUNK_LENGTH_SIZE) !== -1;
  }
}
