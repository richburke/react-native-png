const _clamp = (value, min, max) => Math.min(Math.max(min, value), max);


const _setRgbaPixelData = (pixel, chunks) => {
  const { red, green, blue, alpha } = pixel;
  const { PLTE, IDAT, tRNS } = chunks;

  const color = createRgbaPaletteColor(red, green, blue, alpha);

  const paletteIndex = PLTE.addColor(color);
  IDAT.addRgbColor(red, green, blue);
  // IDAT.addPaletteIndex(paletteIndex);
  tRNS.addAlpha(paletteIndex, alpha);

  // Handle 2 (?) ways to set data, as determined by file type
    // - as palette index
    // - as color info
};

export const convertRgbaToPaletteColor = (red, green, blue, alpha = 255) => {
  red = _clamp(red, 0, 255);
  green = _clamp(green, 0, 255);
  blue = _clamp(blue, 0, 255);
  alpha = _clamp(alpha, 0, 255);
  return (((((alpha << 8) | red) << 8) | green) << 8) | blue;
};

export const convertPaletteColorToRgba = (color) => {
  const alpha = color >> 24 & 255;
  const red = color >> 16 & 255;
  const green = color >> 8 & 255;
  const blue = color & 255;
  return [red, green, blue, alpha];
};

export const setPixel = (type, pos, data, chunks) => {
  const { PLTE, IDAT, tRNS } = chunks;

  let index;
  if (typeof pos === 'object') {
    const { x, y } = pos;
    index = translateXyToIndex(x, y);
  } else {
    index = pos;
  }

  if (typeof data === 'object') {
    const { red, green, blue, alpha = DEFAULT_TRANSPARENCY } = data;
    
  } else {
    index = pos;
  }

};

export const applyPixelData = (type, data, chunks) => {
  const { PLTE, IDAT, tRNS } = chunks;
  // function(red, green, blue, alpha) {

  //   alpha = alpha >= 0 ? alpha : 255;
  //   var color = (((((alpha << 8) | red) << 8) | green) << 8) | blue;

  //   if (typeof this.palette[color] == "undefined") {
  //     if (this.pindex == this.depth) return "\x00";

  //     var ndx = this.plte_offs + 8 + 3 * this.pindex;

  //     // console.log('red', String.fromCharCode(red));
  //     this.buffer[ndx + 0] = String.fromCharCode(red);
  //     // this.buffer[ndx + 0] = Buffer.from(String(red)).toString(FORMAT);
  //     // console.log('green', String.fromCharCode(green));
  //     // this.buffer[ndx + 1] = Buffer.from(String(green)).toString(FORMAT);
  //     this.buffer[ndx + 1] = String.fromCharCode(green);
  //     // console.log('blue', String.fromCharCode(blue));
  //     this.buffer[ndx + 2] = String.fromCharCode(blue);
  //     // this.buffer[ndx + 2] = Buffer.from(String(blue)).toString(FORMAT);
  //     this.buffer[this.trns_offs+8+this.pindex] = String.fromCharCode(alpha);
  //     // this.buffer[this.trns_offs+8+this.pindex] = Buffer.from(String(alpha)).toString(FORMAT);

  //     console.log('color', color, this.pindex);

  //     this.palette[color] = String.fromCharCode(this.pindex++);
  //     // this.palette[color] = Buffer.from(String(this.pindex++)).toString(FORMAT);
  //   }
  //   return this.palette[color];
};

export const deleteColor = (deletedColor, replacementColor, chunks) => {
  const { PLTE, IDAT, tRNS } = chunks;

  // Make sure both are in the palette.
    // Get the palette index value associated with deletedColor
    // Get the palette index value associated with replacmentColor
  
    // Go through each pixel and if it's set to deletedColor's palette index,
    // set it to replacmentColor's index.

    // Delete deletedColor from palette.
};
