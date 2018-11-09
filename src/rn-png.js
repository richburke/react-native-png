/**
 * https://en.wikipedia.org/wiki/Portable_Network_Graphics
 * https://www.w3.org/TR/PNG/
 * http://www.libpng.org/pub/png/
 * http://www.schaik.com/pngsuite/
 */

import {
  SupportedChunks,
  ChunkHeaderSequences,
  BitDepths,
  ColorTypes,
  PixelLayouts,
  DEFAULT_COMPRESSION,
  DEFAULT_FILTER,
  DEFAULT_INTERLACE,
} from './util/constants';
import { CHUNK_LENGTH_SIZE } from './chunks/chunk';
import { indexOfSequence } from './util/typed-array';
import {
  determinePixelColorSize,
  determineHasAlphaSample,
  computeNumberOfPixels,
  computeMaxNumberOfColors
} from './util/png-pixels';
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

  if (metaData.depth > BitDepths.EIGHT) {
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
      depth,
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

const _loadChunk = (ctxt, chunkHeader, bufView) => {
  let chunks;
  let chunk;
  console.log(`I have a ${chunkHeader}`);
  switch (chunkHeader) {
    case 'IHDR':
      chunk = _chunks.get(ctxt)[chunkHeader];
      chunk.load(bufView);
      _applyMetaData(ctxt, chunk.getMetaData());
      break;

    case 'tRNS':
      chunks = _chunks.get(ctxt);
      chunks.tRNS = new tRNS({
        colorType: _colorType.get(ctxt),
        numberOfPixels: computeNumberOfPixels(_width.get(ctxt), _height.get(ctxt)),
        maxNumberOfColors: computeMaxNumberOfColors(_depth.get(ctxt)),
      });
      _chunks.set(ctxt, chunks);
      chunk = _chunks.get(ctxt)[chunkHeader];

      console.log(chunkHeader, bufView);

      chunk.load(bufView);
      break;

    case 'PLTE':
      chunks = _chunks.get(ctxt);
      chunks.PLTE = new PLTE({
        maxNumberOfColors: computeMaxNumberOfColors(_depth.get(ctxt)),
      });
      _chunks.set(ctxt, chunks);
      chunk = _chunks.get(ctxt)[chunkHeader];
      chunk.load(bufView);
      break;

    case 'bKGD':
      chunks = _chunks.get(ctxt);
      chunks.bKGD = new bKGD({
        colorType: _colorType.get(ctxt),
      });
      _chunks.set(ctxt, chunks);
      chunk = _chunks.get(ctxt)[chunkHeader];
      chunk.load(bufView);
      break;

    case 'IDAT':
      console.log(chunkHeader, bufView);

      chunk = _chunks.get(ctxt)[chunkHeader];
      chunk.applyLayoutInformation({
        width: _width.get(ctxt),
        height: _height.get(ctxt),
        depth: _depth.get(ctxt),
        colorType: _colorType.get(ctxt),
        numberOfPixels: computeNumberOfPixels(_width.get(ctxt), _height.get(ctxt)),
      });
      chunk.load(bufView);
      break;

    default:
  }
};

const _doesContainChunk = (ctxt, chunkHeader) => 'undefined' !== typeof _chunks.get(ctxt)[chunkHeader];

const _isColorType = (ctxt, colorType) => colorType === _colorType.get(ctxt);

const _translateXyToIndex = (ctxt, x, y) => {
  const width = _width.get(ctxt);
  const colorType = _colorType.get(ctxt);
  const pixelColorSize = determinePixelColorSize(colorType);
  const hasAlphaSample = determineHasAlphaSample(colorType);
  const fullPixelSize = pixelColorSize + (hasAlphaSample ? 1 : 0);

  return y * (width * fullPixelSize) + (x * fullPixelSize);
};

/**
 * November 8
 * - [√] Get opacities
 * - Set transparency
 * - [√] Set background
 * - Set pixel
 */
/**
 * November 6
 * - Compare with samples via node
 */

/**
 * [√] Get palette
 * [√] Fix,
 * [√] Get data
 * - [√] 1 bit
 * - [√] 2 bit
 * - [√] 4 bit
 * - [√] 8 bit
 * [√] Get palette
 * [√] Get transparencies
 * [√] Set palette color
 * [√] Swap palette color
 * [√] Get background
 * Set transparency
 * [√] Set background
 * Set pixel
 * [√] Get other basics to work
 * [√] Get transparencies to work
 * [√] Get backgrounds to work
 * [x] Convert getters to look like plain properties
 * [√] Limit to 8 bit depth or less
 * Write tests!
 * Clean-up
 * Write app
 * - Write sine wave function
 * - ColorType 0
 * - ColorType 2
 * - ColorType 3
 * - ColorType 4
 * - ColorType 6
 * - From scratch
 * - Choose from PngSuite images
 */

export default class RnPng {

  static PixelLayout = PixelLayouts;

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

      console.log('on load', buffer);

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

      _loadChunk(this, chunkHeader, bufView.subarray(chunkHeaderIndex - CHUNK_LENGTH_SIZE));
    });

    console.log('chunks', this.getChunksUsed());
    console.log('metaData', this.getMetaData());
    // console.log('palette indices', this.getPaletteIndices());

    return this;
  }

  getChunksUsed() {
    return Object.keys(_chunks.get(this)).filter((chunkHeader) => chunkHeader !== 'prefix');
  }

  getData(pixelLayout = RnPng.PixelLayout.VALUE) {
    const rawPixelData = _chunks.get(this).IDAT.pixelData;

    console.log('getData', rawPixelData);

    const pixelData = _isColorType(this, ColorTypes.INDEXED)
      ? _chunks.get(this).PLTE.convertToPixels(rawPixelData)
      : rawPixelData;
    const trnsData = _doesContainChunk(this, 'tRNS')
      ? _chunks.get(this).tRNS.getTransparencies()
      : [];
    return _chunks.get(this).IDAT.getData(pixelLayout, pixelData, trnsData);
  }

  getPalette() {
    if (_doesContainChunk(this, 'PLTE')) {
      throw new Error('Attempting to get palette indices when no palette exists');
    }
    return _chunks.get(this).PLTE.getPalette();
  }

  getOpacities() {
    if (_doesContainChunk(this, 'tRNS')) {
      return _chunks.get(this).tRNS.getTransparencies();
    }

    if (_isColorType(this, ColorTypes.GRAYSCALE_AND_ALPHA)
      || _isColorType(this, ColorTypes.TRUECOLOR_AND_ALPHA)) {
        const data = this.getData();
        const numberOfSamples = determinePixelColorSize(_colorType.get(this)) + 1;
        return data.reduce((acc, curr, ind) => {
          return (ind + 1) % numberOfSamples === 0
            ? acc.concat(curr)
            : acc;
        }, []);
    }

    let opacities = new Uint8ClampedArray(computeNumberOfPixels(
      _width.get(this),
      _height.get(this)
    ));
    return opacities.fill(255);
  }

  getBackground() {
    console.log('bkg', _doesContainChunk(this, 'bKGD'));
    if (_doesContainChunk(this, 'bKGD')) {
      return _chunks.get(this).bKGD.getBackgroundColor();
    }
    return undefined;
  }

  setPixel(pos, data) {
    let index;
    if (Array.isArray(pos) && pos.length === 2) {
      index = _translateXyToIndex(this, ...pos);
    } else {
      index = pos;
    }

    _chunks.get(this).IDAT.setPixel(index, data);
    return this;
  }

  setPaletteColorOf(index, colorData) {
    if (_doesContainChunk(this, 'PLTE')) {
      throw new Error('Attempting to set a palette color when no palette exists');
    }
    _chunks.get(this).PLTE.setColorOf(index, colorData);
    return this;
  }

  replacePaletteColor(targetColor, newColor) {
    if (_doesContainChunk(this, 'PLTE')) {
      throw new Error('Attempting to swap palette when no palette exists');
    }
    _chunks.get(this).PLTE.replaceColor(targetColor, newColor);
    return this;
  }

  setBackground(colorData) {
    if (_doesContainChunk(this, 'bKGD')) {
      _chunks.get(this).bKGD.setBackgroundColor(colorData);
    }
    /**
     * If we have a bGKD chunk, use that
     * If we have a PLTE chunk, set the value 0 to the color and add a tRNS if alpha is supplied
     * Otherwise add a bGKD chunk
     */
    // if (_doesContainChunk(this, 'bGKD')) {

    // }
    // If colorType is indexed (3), do this way.
    // Otherwise add ancillary background attribute.
    // if (Array.isArray(colorData)) {
    //   // _chunks.get(this).PLTE.setBackgroundColor(colorData);
    // } else {
    //   const value = colorData;
    // }

    return this;
  }

  setOpacity(pos, value) {
    let index;
    if (Array.isArray(pos) && pos.length === 2) {
      index = _translateXyToIndex(this, ...pos);
    } else {
      index = pos;
    }

    if (_isColorType(this, ColorTypes.GRAYSCALE_AND_ALPHA)
    || _isColorType(this, ColorTypes.TRUECOLOR_AND_ALPHA)) {
      _chunks.get(this).IDAT.setAlpha(value, index);
    }

    return this;
  }

  setTransparencyOf(index, value) {
    if (_isColorType(this, ColorTypes.INDEXED)
      && index >= this.getPalette().length) {
        throw new Error('Cannot set the transparency of an item not in palette');
    }

    if (!_doesContainChunk(this, 'tRNS')) {
      _chunks.get(this).tRNS = new tRNS({
        colorType: _colorType.get(this),
        numberOfPixels: computeNumberOfPixels(_width.get(this), _height.get(this)),
        maxNumberOfColors: computeMaxNumberOfColors(_depth.get(this)),
      });
    }
    _chunks.get(this).tRNS.setTransparency(index, value);

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
