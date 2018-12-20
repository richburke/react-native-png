import ArrayBufferWrapper from '../util/array-buffer-wrapper';
import { calculateCrc32 } from '../util/crc';

export const CHUNK_LENGTH_SIZE = 4;
export const CHUNK_HEADER_SIZE = 4;
export const CHUNK_CRC32_SIZE = 4;

export default class Chunk {
  constructor(header) {
    this._abw = null;
    this._header = header;
  }

  initialize(size) {
    this._abw = new ArrayBufferWrapper(size);
  }

  get buffer() {
    return this._abw;
  }

  get header() {
    return this._header;
  }

  /*
   * Move this to ArrayBufferWrapper, or least move the logic there.
   */
  copyInto(buffer, offset) {
    buffer.set(this._abw.bufferView, offset);
  }

  copyFrom(src, offset) {
    this._abw.copyFrom(src, offset);
  }

  calculateDataOffset() {
    return CHUNK_LENGTH_SIZE + CHUNK_HEADER_SIZE;
  }

  calculateChunkLength() {
    return CHUNK_LENGTH_SIZE + CHUNK_HEADER_SIZE + CHUNK_CRC32_SIZE;
  }

  /**
   * @todo
   * Set this back to the way it was, without passing chunkLength
   */
  calculateCrc32(chunkLength = -1) {
    chunkLength = chunkLength !== -1 ? chunkLength : this.calculateChunkLength();
    const size = chunkLength - CHUNK_LENGTH_SIZE - CHUNK_CRC32_SIZE;
    return calculateCrc32(this.buffer, CHUNK_LENGTH_SIZE, size);
  }

  isRequired() {
    return false;
  }
}
