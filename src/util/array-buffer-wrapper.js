import {
  readUint8At,
  readUint16At,
  readUint32At,
  writeUint8At,
  writeUint16At,
  writeUint32At,
} from './typed-array';
/**
 * @todo
 * Remove, when we remove asString
 */
import { bv2str } from './string-arraybuffer';

/**
 * @todo
 * - Remove asString()
 * - Update copyInto() & copyFrom()
 * - Finish conversion to using libs
 */
export default class ArrayBufferWrapper {
  _bufferView;
  _offset;

  constructor(size, startingOffset = 0) {
    this._bufferView = new Uint8Array(new ArrayBuffer(size));
    this._offset = startingOffset;
  }

  get offset() {
    return this._offset;
  }

  set offset(value) {
    this._offset = value;
  }

  get bufferView() {
    return this._bufferView;
  }

  readUint8At(offset) {
    return readUint8At(this._bufferView, offset);
  }

  readUint16At(offset, lsb = false) {
    return readUint16At(this._bufferView, offset, lsb);
  }

  readUint32At(offset, lsb = false) {
    return readUint32At(this._bufferView, offset, lsb);
  }

  writeUint8(value) {
    this._offset = writeUint8At(this._bufferView, this._offset, value);
    return this._offset;
  }

  writeUint8At(offset, value) {
    return writeUint8At(this._bufferView, offset, value);
  }

  writeString8(value, lsb) {
    this._offset = this.writeString8At(this._offset, value, lsb);
    return this._offset;
  }

  writeString8At(offset, value, lsb = false) {
    if (lsb) {
      value = value.split('').reverse().join('');
    }
    for (let i = 0, n = value.length; i < n; i++) {
      offset = writeUint8At(this._bufferView, offset, value.charCodeAt(i));
    }
    return offset;
  }

  writeUint16(value, lsb) {
    this._offset = writeUint16At(this._bufferView, this._offset, value, lsb);
    return this._offset;
  }

  writeUint16At(offset, value, lsb = false) {
    return writeUint16At(this._bufferView, offset, value, lsb);
  }

  writeUint32(value, lsb) {
    this._offset = writeUint32At(this._bufferView, this._offset, value, lsb);
    return this._offset;
  }

  writeUint32At(offset, value, lsb = false) {
    return writeUint32At(this._bufferView, offset, value, lsb);
  }

  /**
   * @todo
   * Merge these into copyInto
   * src, offset, length
   */
  copyInto(abuf, length = -1) {
    // console.log('copyInto', abuf);
    const sourceLength = length < 0 ? abuf.length : length;
    let i;
    for (i = 0; i < sourceLength; i++) {
      this._bufferView[i] = abuf[i] & 255;
    }
    // console.log('after copyInto', i, this._bufferView.bytesLength);
  }

  copyFrom(src, offset) {
    if (typeof offset === 'undefined') {
      offset = this._offset;
    }
    this._bufferView.set(src, offset);
  }

  get(index) {
    return this._bufferView[index];
  }

  stepOffset(step) {
    this._offset = this._offset + step;
    return this._offset;
  }

  /**
   * @todo
   * Remove, only for testing.
   */
  asString() {
    return bv2str(this._bufferView);
  }
}