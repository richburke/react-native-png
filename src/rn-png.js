import {
  SupportedChunks,
  BitDepths,
  ColorTypes,
  DEFAULT_COMPRESSION,
  DEFAULT_FILTER,
  DEFAULT_INTERLACE,
} from './util/constants';
import { str2bv, bv2str } from './util/string-arraybuffer';
import { CHUNK_LENGTH_SIZE } from './chunks/chunk';
import ReadOnly from './chunks/read-only';
import Prefix from './chunks/prefix';
import IHDR from './chunks/ihdr';
import PLTE from './chunks/plte';
import tRNS from './chunks/trns';
import IDAT from './chunks/idat';
import IEND from './chunks/iend';

let _chunks = new WeakMap();
let _chunkList = new WeakMap();
let _buffer = new WeakMap();
let _width = new WeakMap();
let _height = new WeakMap();
let _depth = new WeakMap();
let _colorType = new WeakMap();
let _compression = new WeakMap();
let _filter = new WeakMap();
let _interlace = new WeakMap();

/**
 * - Save the relevant chunks!
 * - Modify load() so it doesn't accept a string; it accepts a buffer
 *   - Needs to be able to search for patterns within buffer
 * - Modify constructor so that it works with
 *   - empty initialization
 *   - buffer & zlib
 *   - options
 * - Handle BACKGROUND chunk
 */

export default class RnPng {

  constructor(options = {}) {
    const width = options.width || 0;
    const height = options.height || 0;
    const depth = options.depth || BitDepths.EIGHT;
    const colorType = options.colorType || ColorTypes.INDEXED;
    const compression = options.compression || DEFAULT_COMPRESSION;
    const filter = options.filter || DEFAULT_FILTER;
    const interlace = options.interlace || DEFAULT_INTERLACE;
    const zlibLib = options.zlibLib || null;

    this._applyMetaData({
      width,
      height,
      depth,
      colorType,
      compression,
      filter,
      interlace,
    });

    const numberOfPixels = this._computeNumberOfPixels();
    const maxNumberOfColors = this._computeMaxNumberOfColors();

    _chunks.set(this, {
      prefix: new Prefix(),
      IHDR: new IHDR({
        width,
        height,
        depth,
        colorType,
        compression,
        filter,
        interlace,
      }),
      iCCP: new ReadOnly('iCCP'),
      gAMA: new ReadOnly('gAMA'),
      cHRM: new ReadOnly('cHRM'),
      PLTE: new PLTE({
        maxNumberOfColors,
      }),
      tRNS: new tRNS({
        colorType,
        numberOfPixels,
        maxNumberOfColors,
      }),
      pHYs: new ReadOnly('pHYs'),
      IDAT: new IDAT({
        width,
        height,
        colorType,
        numberOfPixels,
        maxNumberOfColors,
        zlibLib,
      }),
      IEND: new IEND(),
    });

    _buffer.set(this, null);
  }

  /**
   * All these should go outside class, if possible
   */
  initializeEmpty() {

  }

  initializeOptions() {

  }

  initializeBuffer() {

  }

  initializeChunks() {
    _chunks.set(this, {
      prefix: new Prefix(),
      IHDR: new IHDR({
        width,
        height,
        depth,
        colorType,
        compression,
        filter,
        interlace,
      }),
      IDAT: new IDAT({
        width,
        height,
        colorType,
        numberOfPixels,
        maxNumberOfColors,
        zlibLib,
      }),
      IEND: new IEND(),
    });

    // If color type is 3
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

  getMetaData() {
    const width = _width.get(this);
    const height = _height.get(this);
    const depth = _depth.get(this);
    const colorType = _colorType.get(this);
    const compression = _compression.get(this);
    const filter = _filter.get(this);
    const interlace = _interlace.get(this);

    return {
      width,
      height,
      depth,
      colorType,
      compression,
      filter,
      interlace,
    };
  }

  /**
   * @todo
   */
  getBuffer() {
    /**
     * Call _update() first and then _buildBuffer()
     */
    return _buffer.get(this);
  }

  /**
   * Move outside of class
   */
  _applyMetaData(meta) {
    const validBitDepths = Object.values(BitDepths);
    if (!validBitDepths.includes(meta.depth)) {
      throw new Error('Invalid bit depth');
    }

    const validColorTypes = Object.values(ColorTypes);
    if (!validColorTypes.includes(meta.colorType)) {
      throw new Error('Invalid color type');
    }

    _width.set(this, meta.width);
    _height.set(this, meta.height);
    _depth.set(this, meta.depth);
    _colorType.set(this, meta.colorType);
    _compression.set(this, meta.compression);
    _filter.set(this, meta.filter);
    _interlace.set(this, meta.interlace);
  }

  /**
   * Move out of class
   */
  _computeNumberOfPixels() {
    const width = _width.get(this);
    const height = _height.get(this);
    return width * height;
  }

  /**
   * Move out of class
   */
  _computeMaxNumberOfColors() {
    const depth = _depth.get(this);
    return 2 ** depth;
  }

  /**
   * Move out of class.
   */
  update() {
    _chunks.get(this).prefix.update();

    // Iterate through supported chunks.  If in map, update();
    _chunks.get(this).IHDR.update();
    // _chunks.get(this).iCCP.update();
    // _chunks.get(this).gAMA.update();
    // _chunks.get(this).cHRM.update();
    _chunks.get(this).PLTE.update();
    _chunks.get(this).tRNS.update();
    // _chunks.get(this).pHYs.update();
    _chunks.get(this).IDAT.update();



    _chunks.get(this).IEND.update();

    this.buildBuffer();

    return this;
  }

  /**
   * 
   * @todo
   * Call this instead from the constuctor when passed a string.
   * Can I be passed an array of bytes?
   * 
   * - Confirm that it has a prefix
   * - Confirm that it has a IHDR
   * - Confirm that it has an IDAT
   * - Confirm (backwards) that it has an IEND
   */
  load(str) {
    
    // const abuf = new ArrayBuffer(buffer.length);
    // const ua = new Uint8Array(abuf);
    // ua.set(buffer);
    // ua.set(new Uint8Array(buffer));

    // Get the index of header

    // Read from string

    // console.log('typeof', typeof buffer)
    // console.log('typeof', typeof abuf)
    // console.log('slice', abuf.slice(0, 8));
    // console.log('slice', ua.subarray(0, 8));
    // console.log('slice', ua);


    const isPng = _chunks.get(this).prefix.verify(str);
    if (!isPng) {
      throw new Error('Attempting to load data that is not a PNG');
    }

    const bufView = str2bv(str);
    let tmpBufView;

    /**
     * @todo
     * Change this to SupportedChunks
     */
    const REQUIRED_CHUNKS = ['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'];
    // const REQUIRED_CHUNKS = ['IHDR', 'iCCP', 'gAMA', 'cHRM', 'PLTE', 'tRNS', 'pHYs', 'IDAT', 'IEND'];

// 
    // else {
    //   chunk = _chunks.get(this)[chunkHeader];
    //   if (chunk.isRequired()) {
    //     throw new Error('Missing required chunk');
    //   }
    // }

    let chunkHeader;
    let chunkHeaderIndex;

    for (let i=0; i < SupportedChunks.length; i++) {
      chunkHeader = REQUIRED_CHUNKS[i];
      chunkHeaderIndex = str.indexOf(chunkHeader);

      console.log('===>', chunkHeader, chunkHeaderIndex)
      if (chunkHeaderIndex === -1) {
        console.log(chunkHeader, ' not found in ', str);
      }

      if (chunkHeaderIndex >= CHUNK_LENGTH_SIZE) {
        tmpBufView = bufView.subarray(chunkHeaderIndex - CHUNK_LENGTH_SIZE);
        this._loadChunk(chunkHeader, tmpBufView);
      }
    }

    // Confirm that all the required chunks are in there.
    // Maybe just check for IHDR, IDAT, IEND

    // required headers
    // ancillary headers

 

    // let chunkHeaderIndex = _chunks.get(this).IHDR.findHeaderIndex(str);


    // _chunks.get(this).IHDR.extract(str);
    // const meta = _chunks.get(this).IHDR.extract(str);
    // const meta = _chunks.get(this).IHDR.extract(buffer);
    // console.log('meta', meta);
    return this;
  }

  _loadChunk(chunkHeader, bufView) {
    let chunk;
    // const chunk = _chunks.get(this)[chunkHeader];

    switch (chunkHeader) {
      case 'IHDR':
        _chunks.set(this) = new IHDR(/* get default metadata */);

        chunk = _chunks.get(this)[chunkHeader];
        chunk.load(bufView);
        this._applyMetaData(chunk.getMetaData());
        break;

      // case 'iCCP':

      //   console.log('_loadChunk', chunkHeader, bufView);

      //   chunk.load(bufView);
      //   break;

      // case 'gAMA':

      //   console.log('_loadChunk', chunkHeader, bufView);

      //   chunk.load(bufView);
      //   break;

      // case 'cHRM':

      //   console.log('_loadChunk', chunkHeader, bufView);

      //   chunk.load(bufView);
      //   break;

      case 'PLTE':
        // Add to _chunks map
        chunk.maxNumberOfColors = this._computeMaxNumberOfColors();

        // console.log('_loadChunk', chunkHeader, bufView, bv2str(bufView))

        chunk.load(bufView);
        break;

      case 'tRNS':
        chunk.colorType = _colorType.get(this);
        chunk.numberOfPixels = this._computeNumberOfPixels();
        chunk.maxNumberOfColors = this._computeMaxNumberOfColors();

        console.log('_loadChunk', chunkHeader, bufView, bv2str(bufView))

        chunk.load(bufView);
        break;

      // case 'pHYs':

      //   console.log('_loadChunk', chunkHeader, bufView);

      //   chunk.load(bufView);
      //   break;

      case 'IDAT':
        chunk.width = _width.get(this);
        chunk.height = _height.get(this);
        chunk.colorType = _colorType.get(this);
        chunk.numberOfPixels = this._computeNumberOfPixels();
        chunk.maxNumberOfColors = this._computeMaxNumberOfColors();
        chunk.determineSampleSize();

        // console.log('_loadChunk', chunkHeader, bufView, bv2str(bufView))

        chunk.load(bufView);
        break;

      case 'IEND':
        chunk.load(bufView);
        // console.log(chunkHeader, '-->', chunk.asString());
        break;
      default:
    }
  }

  // Return an RnPng object
  copy() {

  }

  // Return an object, so we can do something like.
  /*
  const newRnPng = new RnPng({...oldRnPng.getConfigs(), colorType: 0});
  */
  // getMetaData() {

  // }

  /**
   * Move out of class
   */
  buildBuffer() {
    /**
     * Size problems
     * 361743 is too big
     * So is 320000
     * 
     * Possibilities
     * - increase max size
     * - restrict size of image
     * - just use strings
     */

    const prefixSize = _chunks.get(this).prefix.calculateChunkLength();
    const ihdrSize = _chunks.get(this).IHDR.calculateChunkLength();
    // const iCCPSize = _chunks.get(this).iCCP.calculateChunkLength();
    // const chrmSize = _chunks.get(this).cHRM.calculateChunkLength();
    const plteSize = _chunks.get(this).PLTE.calculateChunkLength();
    const trnsSize = _chunks.get(this).tRNS.calculateChunkLength();
    // const pHYsSize = _chunks.get(this).pHYs.calculateChunkLength();
    const idatSize = _chunks.get(this).IDAT.calculateChunkLength();
    const iendSize = _chunks.get(this).IEND.calculateChunkLength();

    const size = prefixSize +
      ihdrSize +
      // iCCPSize +
      // chrmSize +
      plteSize +
      trnsSize +
      // pHYsSize +
      idatSize +
      iendSize;

    //   console.log('trnsSize', trnsSize);
    //   console.log('idatSize', idatSize);


    const bufView = new Uint8Array(new ArrayBuffer(size));
    // bufView.fill(0);
    _buffer.set(this, bufView);

    // for (let i = 0; i < size; i++) {
    //   _buffer.get(this)[i] = 0;
    // }

    let offset = 0;

    // const buffer = new Uint8Array(new ArrayBuffer(size+2));
    _chunks.get(this).prefix.copyInto(_buffer.get(this), offset);
    offset = offset + prefixSize;
        // console.log('===', bv2str(buffer))

    _chunks.get(this).IHDR.copyInto(_buffer.get(this), offset);
    offset = offset + ihdrSize;
    // _chunks.get(this).iCCP.copyInto(_buffer.get(this), offset);
    // offset = offset + iCCPSize;
    // _chunks.get(this).cHRM.copyInto(_buffer.get(this), offset);
    // offset = offset + chrmSize;
    _chunks.get(this).PLTE.copyInto(_buffer.get(this), offset);
    offset = offset + plteSize;
    _chunks.get(this).tRNS.copyInto(_buffer.get(this), offset);
    offset = offset + trnsSize;
    // _chunks.get(this).pHYs.copyInto(_buffer.get(this), offset);
    // offset = offset + pHYsSize;
    _chunks.get(this).IDAT.copyInto(_buffer.get(this), offset);
    offset = offset + idatSize;
    _chunks.get(this).IEND.copyInto(_buffer.get(this), offset, 'IEND');

    // console.log(_chunks.get(this).cHRM.getChromaticities());

    // console.log('b**', _buffer.get(this));

    // console.log('OFFSETS', offset, buf.byteLength);
    // console.log('===', _buffer.get(this).subarray(0, 20));
    // console.log('===', new TextDecoder('utf-8').decode(_buffer.get(this)));

    // _buffer.set(this, buffer);

    // console.log('RnPng buffer ->', String.fromCharCode.apply(null, buffer));

    return this;
  }

  /**
   * @todo
   * Handle different types of PNG formats
   */
  getPixels() {
    return _chunks.get(this).IDAT.pixels;
  }

  /**
   * @todo
   * 
   */
  getPalette() {
   // Change this to copy the palette or provide more consumable version
    // return Object.keys(_chunks.get(this).PLTE.palette); // Convert to color
    return _chunks.get(this).PLTE.palette;
  }

  /**
   * @todo
   * 
   */
  getOpacities() {

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

      // Test for index type
      // const paletteIndex = _chunks.get(this).PLTE.getColorIndex(data);
      // _chunks.get(this).IDAT.setPixel(pos, paletteIndex);

      _chunks.get(this).IDAT.setPixel(pos, data);
    } else {
      const value = data;
    }

    return this;
  }

  /**
   * @todo
   * Can this be folded into something else?
   */
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

  /**
   * @todo
   */
  swapPaletteColor(targetColor, newColor) {

  }

  dedupePalette() {
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

  /**
   * @todo
   */
  setOpacity(index, value) {

  }

  applyZlibLib(lib) {
    _chunks.get(this).IDAT.applyZlibLib(lib);
    return this;
  }

  /**
   * @todo
   * remove
   */
  asString() {
    return String.fromCharCode.apply(null, _buffer.get(this));
  }
}
