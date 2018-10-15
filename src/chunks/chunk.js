import ArrayBufferWrapper from '../util/array-buffer-wrapper';
import { calculateCrc32 } from '../util/crc';

export const CHUNK_LENGTH_SIZE = 4;
export const CHUNK_HEADER_SIZE = 4;
export const CHUNK_CRC32_SIZE = 4;

export default class Chunk {
  _abw;

  initialize(size) {
    this._abw = new ArrayBufferWrapper(size);
  }

  get buffer() {
    return this._abw;
  }

  copyInto(buffer, offset) {
    const chunkLength = this.calculateChunkLength();
    for (let i = 0; i < chunkLength; i++) {
      buffer[offset + i] = this.buffer.get(i);
    }
    return this;
  }

  calculateChunkLength() {
    return CHUNK_LENGTH_SIZE + CHUNK_HEADER_SIZE + CHUNK_CRC32_SIZE;
  }

  calculateCrc32() {
    const size = this.calculateChunkLength() - CHUNK_LENGTH_SIZE - CHUNK_CRC32_SIZE;
    return calculateCrc32(this.buffer, CHUNK_LENGTH_SIZE, size);
  }

  asString() {
    return this.buffer.asString();
  }
}
