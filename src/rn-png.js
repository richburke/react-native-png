import { BitDepths, ColorTypes, DEFAULT_TRANSPARENCY } from './util/constants';
import Prefix from './chunks/prefix';
import IHDR from './chunks/ihdr';
import PLTE from './chunks/plte';
import tRNS from './chunks/trns';
import IDAT from './chunks/idat';
import IEND from './chunks/iend';

// import { convertRgbaToPaletteColor } from './pixels';


let _chunks = new WeakMap();
let _buffer = new WeakMap();
let _width = new WeakMap();
let _height = new WeakMap();
let _depth = new WeakMap();
let _colorType = new WeakMap();

export default class RnPng {

  constructor(options) {
    const width = options.width || 0;
    const height = options.height || 0;
    const depth = options.depth || BitDepths.EIGHT;
    const colorType = options.colorType || ColorTypes.INDEXED;
    const numberOfPixels = width * height;
    const maxNumberOfColors = 2 ** depth;

    const validBitDepths = Object.values(BitDepths);
    if (!validBitDepths.includes(depth)) {
      throw new Error('Invalid bit depth');
    }

    const validColorTypes = Object.values(ColorTypes);
    if (!validColorTypes.includes(colorType)) {
      throw new Error('Invalid color type');
    }

    _width.set(this, width);
    _height.set(this, height);
    _depth.set(this, depth);
    _colorType.set(this, colorType);

    _chunks.set(this, {
      prefix: new Prefix(),
      IHDR: new IHDR({
        width,
        height,
        depth,
        colorType,
      }),
      PLTE: new PLTE({
        maxNumberOfColors,
      }),
      tRNS: new tRNS({
        colorType,
        numberOfPixels,
        maxNumberOfColors,
      }),
      IDAT: new IDAT({
        width,
        height,
        colorType,
        numberOfPixels,
        maxNumberOfColors,
      }),
      IEND: new IEND(),
    });

    _buffer.set(this, null);
  }

  update() {
    this.write();
    this.buildBuffer();
    return this;
  }

  write() {
    _chunks.get(this).prefix.write();
    _chunks.get(this).IHDR.write();
    _chunks.get(this).PLTE.write();
    _chunks.get(this).tRNS.write();
    _chunks.get(this).IDAT.write();
    _chunks.get(this).IEND.write();
    return this;
  }

  // Return an RnPng object
  copy() {

  }

  // Return an object, so we can do something like.
  /*
  const newRnPng = new RnPng({...oldRnPng.getConfigs(), colorType: 0});
  */
  getConfigs() {

  }

  buildBuffer() {
    const prefixSize = _chunks.get(this).prefix.calculateChunkLength();
    const ihdrSize = _chunks.get(this).IHDR.calculateChunkLength();
    const plteSize = _chunks.get(this).PLTE.calculateChunkLength();
    const trnsSize = _chunks.get(this).tRNS.calculateChunkLength();
    const idatSize = _chunks.get(this).IDAT.calculateChunkLength();
    const iendSize = _chunks.get(this).IEND.calculateChunkLength();

    const size = prefixSize +
      ihdrSize +
      plteSize +
      trnsSize +
      idatSize +
      iendSize;

      console.log('trnsSize', trnsSize);
      console.log('idatSize', idatSize);

    let offset = 0;
    let buffer = new Uint8Array(new ArrayBuffer(size));
    _chunks.get(this).prefix.copyInto(buffer, offset);
    offset = offset + prefixSize;
    _chunks.get(this).IHDR.copyInto(buffer, offset);
    offset = offset + ihdrSize;
    _chunks.get(this).PLTE.copyInto(buffer, offset);
    offset = offset + plteSize;
    _chunks.get(this).tRNS.copyInto(buffer, offset);
    offset = offset + trnsSize;
    _chunks.get(this).IDAT.copyInto(buffer, offset);
    offset = offset + idatSize;
    _chunks.get(this).IEND.copyInto(buffer, offset);
    _buffer.set(this, buffer);

    console.log('RnPng buffer ->', String.fromCharCode.apply(null, buffer));

    return this;
  }

  getColors() {

  }

  getPalette() {

  }

  getPixels() {

  }

  setPixel(pos, data) {
    if (Array.isArray(data)) {
      // const red = data[0];
      // const green = data[1];
      // const blue = data[2];
      // const alpha = data[3] || DEFAULT_TRANSPARENCY;
      // if (SHOWCOUNT < 2) {
      //   console.log(index, red, green, blue, alpha);
      // }

      const paletteIndex = _chunks.get(this).PLTE.getColorIndex(data);
      _chunks.get(this).IDAT.setPixel(pos, paletteIndex);
    } else {
      const value = data;
    }

    return this;
  }

  addColorToPalette(colorData) {
    // Throw an error if not type 3 (?)
    
    if (Array.isArray(colorData)) {
      _chunks.get(this).PLTE.addColor(colorData);

      // Fix!
      // Need index from palette.
      _chunks.get(this).tRNS.setTransparency(0, 255);
      _chunks.get(this).tRNS.setTransparency(1, 255);
      _chunks.get(this).tRNS.setTransparency(2, 255);
      _chunks.get(this).tRNS.setTransparency(3, 255);
    } else {
      const value = colorData;
    }

    return this;
  }

  setBackground(colorData) {
    // If colorType is indexed (3), do this way.
    // Otherwise add ancillary background attribute.
    if (Array.isArray(colorData)) {
      _chunks.get(this).PLTE.setBackgroundColor(colorData);
    } else {
      const value = colorData;
    }

    return this;
  }

  getPalette() {
    // Change this to copy the palette or provide more consumable version
    // return Object.keys(_chunks.get(this).PLTE.palette); // Convert to color
    return _chunks.get(this).PLTE.palette;
  }

  asString() {
    return String.fromCharCode.apply(null, _buffer.get(this));
  }

  get width() {
    return _width.get(this);
  }

  get height() {
    return _height.get(this);
  }

  get depth() {
    return _depth.get(this);
  }

  get buffer() {
    return _buffer.get(this);
  }
}
