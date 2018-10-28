import {
  SupportedChunks,
  ChunkHeaderSequences,
  BitDepths,
  ColorTypes,
  DEFAULT_COMPRESSION,
  DEFAULT_FILTER,
  DEFAULT_INTERLACE,
} from './util/constants';
import { CHUNK_LENGTH_SIZE } from './chunks/chunk';
import { indexOfSequence } from './util/typed-array';
import { computeNumberOfPixels, computeMaxNumberOfColors } from './util/pixels';
import Prefix from './chunks/prefix';
import IHDR from './chunks/ihdr';
import tRNS from './chunks/trns';
import PLTE from './chunks/plte';
import bKGD from './chunks/bkgd';
import IDAT from './chunks/idat';
import IEND from './chunks/iend';

let _chunks = new WeakMap();
let _buffer = new WeakMap();
let _width = new WeakMap();
let _height = new WeakMap();
let _depth = new WeakMap();
let _colorType = new WeakMap();
let _compression = new WeakMap();
let _filter = new WeakMap();
let _interlace = new WeakMap();
let _zlibLib = new WeakMap();

const _applyMetaData = (ctxt, metaData) => {
  const validBitDepths = Object.values(BitDepths);
  if (!validBitDepths.includes(metaData.depth)) {
    throw new Error('Invalid bit depth');
  }

  const validColorTypes = Object.values(ColorTypes);
  if (!validColorTypes.includes(metaData.colorType)) {
    throw new Error('Invalid color type');
  }

  _width.set(ctxt, metaData.width);
  _height.set(ctxt, metaData.height);
  _depth.set(ctxt, metaData.depth);
  _colorType.set(ctxt, metaData.colorType);
  _compression.set(ctxt, metaData.compression);
  _filter.set(ctxt, metaData.filter);
  _interlace.set(ctxt, metaData.interlace);
};

const _initializeChunks = (ctxt, metaData) => {
  const {
    width,
    height,
    depth,
    colorType,
    compression,
    filter,
    interlace,
  } = metaData;

  const zlibLib = _zlibLib.get(ctxt);
  const numberOfPixels = computeNumberOfPixels(width, height);
  const maxNumberOfColors = computeMaxNumberOfColors(depth);

  let chunks = {
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
  };

  if (colorType === ColorTypes.INDEXED) {
    chunks.PLTE = new PLTE({
      maxNumberOfColors,
    });
  }

  _chunks.set(ctxt, chunks);
};

const _updateChunks = (ctxt) => {
  const chunks = _chunks.get(ctxt);

  chunks.prefix.update();
  const existingChunkTypes = Object.keys(chunks);
  SupportedChunks.forEach((chunkType) => {
    if (-1 === existingChunkTypes.indexOf(chunkType)) {
      return;
    }
    chunks[chunkType].update();
  });
  _chunks.set(ctxt, chunks);
};

const _buildBuffer = (ctxt) => {
  const chunks = _chunks.get(ctxt);
  const chunkTypes = Object.keys(chunks);
  const chunkSizes = chunkTypes.reduce((acc, chunkType) => {
    acc[chunkType] = chunks[chunkType].calculateChunkLength();
    return acc;
  }, {});
  const totalSize = Object.values(chunkSizes).reduce((acc, size) => {
    return acc + size;
  }, 0);

  console.log(chunkSizes, totalSize)

  const bufView = new Uint8Array(new ArrayBuffer(totalSize));

  let offset = 0;
  chunks.prefix.copyInto(bufView, offset);
  offset += chunkSizes.prefix;

  const existingChunkTypes = Object.keys(chunks);
  SupportedChunks.forEach((chunkType) => {
    if (-1 === existingChunkTypes.indexOf(chunkType)) {
      return;
    }
    chunks[chunkType].copyInto(bufView, offset);
    offset += chunkSizes[chunkType];
  });
  _buffer.set(ctxt, bufView);
};


/**
 * - Modify constructor so that it works with
 *   - empty initialization
 *   - options
 * - Limit to 8 bit depth / sample
 * - Move filters to their own util
 * - Clean-up
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

    _applyMetaData(this, {
      width,
      height,
      depth,
      colorType,
      compression,
      filter,
      interlace,
    });
    _zlibLib.set(this, zlibLib);
    _buffer.set(this, null);

    _initializeChunks(this, this.getMetaData());
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

  getBuffer() {
    _updateChunks(this);
    _buildBuffer(this);
    return _buffer.get(this);
  }

  from(buffer) {
    const bufView = buffer instanceof Uint8Array
      ? buffer
      : Uint8Array.from(buffer);

    if (!_chunks.get(this).prefix.verify(bufView)
      || !_chunks.get(this).IHDR.verify(bufView)
      || !_chunks.get(this).IDAT.verify(bufView)
      || !_chunks.get(this).IEND.verify(bufView)) {
        throw new Error('Attempting to load data that is not a PNG');
    }

    // We may have created an empty PLTE chunk for the default color type.
    let chunks = _chunks.get(this);
    if (chunks.PLTE) {
      delete(chunks.PLTE);
    }
    _chunks.set(this, chunks);

    let chunkHeaderIndex = 0;
    let startIndex = 0;
    SupportedChunks.forEach((chunkHeader) => {
      if (chunkHeader === 'IEND') {
        return; // We don't need to load this chunk.
      }

      let tmpHeaderIndex = indexOfSequence(bufView, ChunkHeaderSequences[chunkHeader], startIndex);
      if (-1 === tmpHeaderIndex) {
        return;
      }

      chunkHeaderIndex = tmpHeaderIndex;
      startIndex = chunkHeaderIndex + 4;

      this._loadChunk(chunkHeader, bufView.subarray(chunkHeaderIndex - CHUNK_LENGTH_SIZE));
    });

    console.log('chunks', this.getChunksUsed());
    console.log('metaData', this.getMetaData());

    return this;
  }

  /**
   * @todo
   * Move out of class
   */
  _loadChunk(chunkHeader, bufView) {
    let chunks;
    let chunk;
    switch (chunkHeader) {
      case 'IHDR':
        chunk = _chunks.get(this)[chunkHeader];
        chunk.load(bufView);
        _applyMetaData(this, chunk.getMetaData());
        break;

      case 'tRNS':
        chunks = _chunks.get(this);
        chunks.tRNS = new tRNS({
          colorType: _colorType.get(this),
          numberOfPixels: computeNumberOfPixels(_width.get(this), _height.get(this)),
          maxNumberOfColors: computeMaxNumberOfColors(_depth.get(this)),
        });
        _chunks.set(this, chunks);
        chunk = _chunks.get(this)[chunkHeader];
        chunk.load(bufView);
        break;

      case 'PLTE':
        chunks = _chunks.get(this);
        chunks.PLTE = new PLTE({
          maxNumberOfColors: computeMaxNumberOfColors(_depth.get(this)),
        });
        _chunks.set(this, chunks);
        chunk = _chunks.get(this)[chunkHeader];
        chunk.load(bufView);
        break;

      case 'bKGD':
        chunks = _chunks.get(this);
        chunks.bKGD = new bKGD({
          colorType: _colorType.get(this),
        });
        _chunks.set(this, chunks);
        chunk = _chunks.get(this)[chunkHeader];
        chunk.load(bufView);
        break;

      case 'IDAT':
        chunk = _chunks.get(this)[chunkHeader];
        chunk.applyLayoutInformation({
          width: _width.get(this),
          height: _height.get(this),
          colorType: _colorType.get(this),
          numberOfPixels: computeNumberOfPixels(_width.get(this), _height.get(this)),
        });
        chunk.load(bufView);
        break;

      default:
    }
  }

  getChunksUsed() {
    return Object.keys(_chunks.get(this)).filter((chunkHeader) => chunkHeader !== 'prefix');
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
    return this;
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
    return this;
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
