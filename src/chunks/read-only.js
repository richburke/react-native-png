import Chunk from './chunk';

export default class ReadOnly extends Chunk {
  constructor(hdr) {
    super(hdr);
    this._payloadSize;
  }

  update() {}

  load(abuf) {
    this._payloadSize = this._readPayloadSize(abuf);
    console.log('payload size', this._header, this._payloadSize);
    const chunkLength = this.calculateChunkLength();
    this.initialize(chunkLength);
    this.buffer.copyInto(abuf, chunkLength);
  }

  _readPayloadSize(abuf) {
    let value = abuf[0] << 24;
    value += abuf[1] << 16;
    value += abuf[2] << 8;
    value += abuf[3] & 255;
    return value;
  }

  calculateChunkLength() {
    return super.calculateChunkLength() + this._payloadSize;
  }
}
