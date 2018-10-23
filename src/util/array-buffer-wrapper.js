import { bv2str } from './string-arraybuffer';

/**
 * Remove?
 */
export const checkIsLittleEndian = () => {
  var abuf = new ArrayBuffer(2);
  var uint8Array = new Uint8Array(abuf);
  var uint16Array = new Uint16Array(abuf);
  uint8Array[0] = 0xAA;
  uint8Array[1] = 0xBB;
  return uint16Array[0] === 0xBBAA;
};


/**
 * Always return {offset, value}?
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

  writeUint8(value) {
    this._offset = this.writeUint8At(this._offset, value);
    return this._offset;
  }

  writeUint8At(offset, value) {
    this._bufferView[offset++] = value & 255;
    return offset;
  }

  readUint8At(offset) {
    let newOffset = offset;
    const value = this._bufferView[newOffset++] & 255;
    return value;
  }

  writeUint16(value, lsb) {
    this._offset = this.writeUint16At(this._offset, value, lsb);
    return this._offset;
  }

  writeUint16At(offset, value, lsb = false) {
    if (lsb) {
      this._bufferView[offset++] = value & 255;
      this._bufferView[offset++] = (value >> 8) & 255;
    } else {
      this._bufferView[offset++] = (value >> 8) & 255;
      this._bufferView[offset++] = value & 255;
    }
    return offset;
  }
    
  writeUint32(value, lsb) {
    this._offset = this.writeUint32At(this._offset, value, lsb);
    return this._offset;
  }

  writeUint32At(offset, value, lsb = false) {
    if (lsb) {
      this._bufferView[offset++] = value & 255;
      this._bufferView[offset++] = (value >> 8) & 255;
      this._bufferView[offset++] = (value >> 16) & 255;
      this._bufferView[offset++] = (value >> 24) & 255;
    } else {
      this._bufferView[offset++] = (value >> 24) & 255;
      this._bufferView[offset++] = (value >> 16) & 255;
      this._bufferView[offset++] = (value >> 8) & 255;
      this._bufferView[offset++] = value & 255;
    }
    return offset;
  }

  readUint32At(offset, lsb = false) {
    let value;
    let newOffset = offset;

    if (lsb) {
      value = this._bufferView[newOffset++] & 255;
      value += this._bufferView[newOffset++] << 8
      value += this._bufferView[newOffset++] << 16;
      value += this._bufferView[newOffset++] << 24;
    } else {
      value = this._bufferView[newOffset++] << 24;
      value += this._bufferView[newOffset++] << 16;
      value += this._bufferView[newOffset++] << 8;
      value += this._bufferView[newOffset++] & 255;
    }
    return value;
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
      offset = this.writeUint8At(offset, value.charCodeAt(i));
    }
    return offset;
  }

  // readString8At(offset, str, length) {
  //   for (let i = 0, n = value.length; i < n; i++) {
  //     offset = this.writeUint8At(offset, value.charCodeAt(i));
  //   }

  //   var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  //   var bufView = new Uint16Array(buf);
  //   for (var i=0, strLen=str.length; i < strLen; i++) {
  //     bufView[i] = str.charCodeAt(i);
  //   }

  //   return offset;
  // }

  /**
   * Merge these into copyInto
   * src, offset, length
   */
  copyInto(abuf, length = -1) {
    const sourceLength = length < 0 ? abuf.length : length;
    for (let i = 0; i < sourceLength; i++) {
      this._bufferView[i] = abuf[i] & 255;
    }
  }

  copyFrom(src, offset) {
    if (typeof offset === 'undefined') {
      offset = this._offset;
    }
    this._bufferView.set(src, offset);
  }

  // copyFrom(sourceBuffer, offset = 0, length = -1, asString = false) {
  //   const sourceLength = length < 0 ? sourceBuffer.length : length;
  //   if (sourceLength + offset > this._bufferView.length) {
  //     throw new Error('Offset and source buffer are too large for target buffer');
  //   }

  //   const fnc = asString ?
  //     'writeString8At' :
  //     'writeUint8At';

  //   let newOffset = offset;
  //   for (let i = offset, n = sourceLength; i < n; i += 1) {
  //     newOffset = this[fnc](newOffset, sourceBuffer[i]);
  //   }

  //   console.log('->', sourceLength, newOffset);
  //   console.log('->', this.asString());

  //   return newOffset;
  // }

  get(index) {
    return this._bufferView[index];
  }

  stepOffset(step) {
    this._offset = this._offset + step;
    return this._offset;
  }

  asString() {
    return bv2str(this._bufferView);
  }
}