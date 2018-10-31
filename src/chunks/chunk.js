import ArrayBufferWrapper from '../util/array-buffer-wrapper';
import { calculateCrc32 } from '../util/crc';

import { bv2str } from '../util/string-arraybuffer';

export const CHUNK_LENGTH_SIZE = 4;
export const CHUNK_HEADER_SIZE = 4;
export const CHUNK_CRC32_SIZE = 4;

export default class Chunk {
  _abw;
  _header;

  constructor(header) {
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
    // if (chunkHdr === 'IEND') {
    //   const chunkLength = this.calculateChunkLength();
    //   // for (let i = 0; i < chunkLength; i++) {
    //   //   buffer[offset + i] = this.buffer.get(i);
    //   // }
    // } else {
      // const chunkLength = this.calculateChunkLength();
      // for (let i = 0; i < chunkLength; i++) {
      //   buffer[offset + i] = this.buffer.get(i);
      // }
    // }

    console.log('copyInto ->', this.header, this._abw.bufferView);
    buffer.set(this._abw.bufferView, offset);

    // return this;
  }

  copyFrom(src, offset) {
    // if (chunkHdr === 'IEND') {
    //   const chunkLength = this.calculateChunkLength();
    //   // for (let i = 0; i < chunkLength; i++) {
    //   //   buffer[offset + i] = this.buffer.get(i);
    //   // }
    // } else {
      // const chunkLength = this.calculateChunkLength();
      // for (let i = 0; i < chunkLength; i++) {
      //   buffer[offset + i] = this.buffer.get(i);
      // }
    // }
    this._abw.copyFrom(src, offset);

    // return this;
  }

  calculateDataOffset() {
    return CHUNK_LENGTH_SIZE + CHUNK_HEADER_SIZE;
  }

  calculateChunkLength() {
    return CHUNK_LENGTH_SIZE + CHUNK_HEADER_SIZE + CHUNK_CRC32_SIZE;
  }

  /**
   * Set this back to the way it was, without passing chunkLength
   */
  calculateCrc32(chunkLength = -1) {
    chunkLength = chunkLength !== -1 ? chunkLength : this.calculateChunkLength();
    const size = chunkLength - CHUNK_LENGTH_SIZE - CHUNK_CRC32_SIZE;
    console.log('size -->', chunkLength, size);
    return calculateCrc32(this.buffer, CHUNK_LENGTH_SIZE, size);
  }

  isRequired() {
    return false;
  }

  asString() {
    return this.buffer.asString();
  }
}
