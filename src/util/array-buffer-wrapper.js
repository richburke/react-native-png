export const checkIsLittleEndian = () => {
  var abuf = new ArrayBuffer(2);
  var uint8Array = new Uint8Array(abuf);
  var uint16Array = new Uint16Array(abuf);
  uint8Array[0] = 0xAA;
  uint8Array[1] = 0xBB;
  return uint16Array[0] === 0xBBAA;
};

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

  get(index) {
    return this._bufferView[index];
  }

  stepOffset(step) {
    this._offset = this._offset + step;
    return this._offset;
  }

  asString() {
    return String.fromCharCode.apply(null, this._bufferView);
  }
}