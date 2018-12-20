# react-native-png
Functionality for dynamically creating and modifying PNGs in React Native.

The library has very few dependencies.  Notably the library does not rely on HTML Canvas; nor does it rely on modules that can only run in a Node environment.

This project drew inspiration, and some code, from:
* [PngPong](https://github.com/gdnmobilelab/png-pong)
* [PNGLib](https://www.xarg.org/2010/03/generate-client-side-png-files-using-javascript/)
* [pngjs](https://github.com/lukeapage/pngjs)

You can find a React Native app that demos basic `react-native-png` functionality [--> here](https://github.com/richburke/react-native-png-tester).

### Table of Contents
* [Installation](#installation)
* [Examples](#examples)
* [Interface](#interface)
* [Restrictions](#restrictions)
* [Reference](#reference)
* [Changelog](#changelog)

### <a name="installation">Installation</a>

```
npm install react-native-png --save
```
or 
```
yarn add react-native-png
```

### <a name="examples">Examples</a>
##### A super simple React Native PNG
```
import RnPng from 'react-native-png';
import pako from 'pako';
import base64js from 'base64-js';

const png = new RnPng({
  width: 10,
  height: 10,
  zlibLib: pako,
}).setPixelAt([5, 5], [255, 0, 0]);
const base64ImageData = base64js.fromByteArray(png.getBuffer());

...

<Image
  style={{width: 10, height: 10}}
  source={{ uri: `data:image/png;base64,${base64ImageData}` }}
/>
```


##### Modifying an existing PNG
```
import RnPng from 'react-native-png';
import pako from 'pako';
import base64js from 'base64-js';

...

// sourceImageData is a base64 string pulled from file or camera, etc.
const bytes = Object.values(base64js.toByteArray(sourceImageData));
const bufView = Uint8Array.from(bytes);
const pngBuf = new RnPng()
    .applyZlibLib(pako)
    .from(bufView)
    .setPixelAt([10, 15], [0, 255, 0])
    .getBuffer();
```


### <a name="interface">Interface</a>
**Constructor(**`options`**)**  
Creates a new RnPng object.

&nbsp;&nbsp;&nbsp;&nbsp;_Options include:_  
&nbsp;&nbsp;&nbsp;&nbsp;`width`: Defaults to 0.  Only set this if creating an image from scratch.  
&nbsp;&nbsp;&nbsp;&nbsp;`height`: Defaults to 0.  Only set this if creating an image from scratch.  
&nbsp;&nbsp;&nbsp;&nbsp;`depth`: Defaults to 8.  The number of bits used to specify a color sample.  Only set this if creating an image from scratch.   
&nbsp;&nbsp;&nbsp;&nbsp;`colorType`: Defaults to 3 (indexed).  The format the image data is stored in.  Only set this if creating an image from scratch or if creating the image from the source of another image.   
&nbsp;&nbsp;&nbsp;&nbsp;`zlibLib`: Defaults to `null`.  This must be set before reading or outputting an image buffer.

#### Static constants  
_RnPng.PixelLayout_  
Defines which type of data should be returned from the `getData()` method.  The types of data available are largely dependent upon the image's color type.

&nbsp;&nbsp;&nbsp;&nbsp;`PixelLayout.VALUE`: (Default)  Returns whatever raw format the data is in.  So, for example, in the case of an indexed image palette indexes would be returned.  
&nbsp;&nbsp;&nbsp;&nbsp;`PixelLayout.INDEX_VALUE`: Only for use with indexed images.  Returns the palette indices stored in the IDAT chunk.  
&nbsp;&nbsp;&nbsp;&nbsp;`PixelLayout.RGB`: Returns pixel data in sequences of RGB values.  
&nbsp;&nbsp;&nbsp;&nbsp;`PixelLayout.RGBA`: Returns pixel data in sequences of RGBA values.  If the alpha or transparency channel does not exist, 255 is returned as the alpha.  

#### Properties  
The following are readable as properties on the object.  They are writable only during object creation or when loading data from another image.  
`width`: The width of the image  
`height`: The height of the image  
`depth`: The depth of the image  

#### Methods  
**getMetaData()**  
Gets high-level, descriptive data about the image.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;An object containing values specifying the width, height, depth,  and color type.  In addition, it contains values for the compression, filter, and interlace settings.

**getBuffer()**  
Assembles and returns the data buffer that represents the image file.  A base64 string can be created from this data and displayed as the visible image.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;A `Uint8Array` representing the image data

**from(**`bufView`**)**  
Loads source image data into the RnPng object.

&nbsp;&nbsp;&nbsp;&nbsp;_Arguments_  
&nbsp;&nbsp;&nbsp;&nbsp;`bufView`: A `Uint8Array` representing the data of a source image 

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;The `this` context

**getChunksUsed()**  
Returns a list of the chunks that comprise the PNG.  You can find more information about the available chunks in the [Reference](#reference) section below.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;An array containing the names of the chunks contained within the image 

**getData(**`pixelLayout = RnPng.PixelLayout.VALUE`**)**  
Returns a flat list of the samples used to render pixels.  The number of samples used to generate a pixel is determined by the image's color type.

&nbsp;&nbsp;&nbsp;&nbsp;_Arguments_  
&nbsp;&nbsp;&nbsp;&nbsp;`pixelsLayout`: A constant of type `RnPng.PixelLayout`, specifies how an individual pixel should be represented 

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;An array of pixel data

**getPalette()**  
Returns the complete list of palette entries.  Can only be used on indexed images.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;An array of two-value arrays, whose values are the palette index and the color value associated with that index

**getPaletteIndexAt(**`pos`**)**  
Returns the palette index associated with the pixel specified by the supplied position.  Can only be used on indexed images.

&nbsp;&nbsp;&nbsp;&nbsp;_Arguments_  
&nbsp;&nbsp;&nbsp;&nbsp;`pos`: An array of the form `[x, y]`  

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;An integer representing the palette index, or -1 if not found

**getPaletteColorAt(**`pos`**)**  
Returns the palette color associated with the pixel specified by the supplied position.  Can only be used on indexed images.

&nbsp;&nbsp;&nbsp;&nbsp;_Arguments_  
&nbsp;&nbsp;&nbsp;&nbsp;`pos`: An array of the form `[x, y]`  

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;An array of pixel color samples, or `undefined` if not found

**getOpacities()**  
Gets a list of the opacities from the alpha channel of the image.  Images that do not have an alpha channel will receive an array of length equal to the number of pixels, with each element being the full opacity value (255).

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;An array of opacity values (0 - 255)

**getTransparencies()**  
Gets a list of the colors that should be rendered transparent.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;An array of RGB sequences or individual integer values (0 - 255), depending upon the color type of the image

**doesColorExistInTransparencies(**`colorData`**)**  
Indicates whether or not the specified color exists in the list of colors that should be rendered transparent.

&nbsp;&nbsp;&nbsp;&nbsp;_Arguments_  
&nbsp;&nbsp;&nbsp;&nbsp;`colorData`: An array of pixel color samples--e.g., `[123, 0, 238]`.  

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;A boolean

**getBackground()**  
Gets the background color of the image. 

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;An array of pixel sample data, or `undefined` if the image does not have a bKGD chunk  

**getPixelAt(**`pos`**)**  
Gets the pixel sample data at the specified position.

&nbsp;&nbsp;&nbsp;&nbsp;_Arguments_  
&nbsp;&nbsp;&nbsp;&nbsp;`pos`: Either a pixel index or an array of the form `[x, y]`, specifying the location of the pixel data to be retrieved  

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;An array of pixel sample data  


**setPixelAt(**`pos`, `pixelData`**)**  
Sets the sample data for a pixel at the specified position.

&nbsp;&nbsp;&nbsp;&nbsp;_Arguments_  
&nbsp;&nbsp;&nbsp;&nbsp;`pos`: Either a pixel index or an array of the form `[x, y]`, specifying the location of the pixel to be modified  
&nbsp;&nbsp;&nbsp;&nbsp;`pixelData`: An array of pixel samples as dictated by the color type of the image  

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;The `this` context

**setPaletteColorOf(**`index`, `colorData`**)**  
Sets the color data of the palette entry indicated by the supplied index. 

&nbsp;&nbsp;&nbsp;&nbsp;_Arguments_  
&nbsp;&nbsp;&nbsp;&nbsp;`index`: The palette index that should have its color data set.  
&nbsp;&nbsp;&nbsp;&nbsp;`colorData`: An array of pixel color samples--e.g., `[238, 130, 238]`.    

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;The `this` context

**replacePaletteColor(**`targetColor`, `newColor`**)**  
Replaces the first palette entry matching the supplied target color with the replacement color. 

&nbsp;&nbsp;&nbsp;&nbsp;_Arguments_  
&nbsp;&nbsp;&nbsp;&nbsp;`targetColor`: An array of pixel color samples--e.g., `[238, 130, 238]`.  
&nbsp;&nbsp;&nbsp;&nbsp;`newColor`: An array of pixel color samples.    

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;The `this` context

**setOpacityAt(**`pos`, `value`**)**  
Sets the opacity of a pixel.  Non-indexed image types require an alpha channel to have their opacity set. For indexed image types, using this method or `setTransparency()` accomplishes the same result.  

&nbsp;&nbsp;&nbsp;&nbsp;_Arguments_  
&nbsp;&nbsp;&nbsp;&nbsp;`pos`: Either a pixel index or an array of the form `[x, y]`, specifying the location of the pixel to be modified.  
&nbsp;&nbsp;&nbsp;&nbsp;`value`: For non-indexed images, an array of RGB values--e.g., `[0, 255, 255]`--that specifies the color to be made transparent.  For indexed images, a value (0 - 255) that indicates the transparency (opacity) of the pixel.  

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;The `this` context

**setTransparency(**`value`, `index = -1`**)**  
Depending upon the image's color type, sets a pixel as transparent for non-indexed images or applies a transparency value (0 - 255) for indexed images.

&nbsp;&nbsp;&nbsp;&nbsp;_Arguments_  
&nbsp;&nbsp;&nbsp;&nbsp;`value`: For non-indexed images, an array of RGB values--e.g., `[0, 255, 255]`--that specifies the color to be made transparent.  For indexed images, a value (0 - 255) that indicates the transparency (opacity) of the pixel.  
&nbsp;&nbsp;&nbsp;&nbsp;`index`: Defaults to -1; only used for indexed images.  The palette index that should have its transparency (opacity) set.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;The `this` context

**removeTransparency(**`colorData`**)**  
Removes a single transparency for the color matching the supplied data.  The image must have a tRNS chunk.

&nbsp;&nbsp;&nbsp;&nbsp;_Arguments_  
&nbsp;&nbsp;&nbsp;&nbsp;`colorData`: An array of pixel color samples.  

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;The `this` context

**setBackground(**`colorData`**)**  
Sets a color as the background of the image.

&nbsp;&nbsp;&nbsp;&nbsp;_Arguments_  
&nbsp;&nbsp;&nbsp;&nbsp;`colorData`: An array of pixel color samples.  

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;The `this` context

**removeTransparencies()**  
Removes the tRNS chunk from the image.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;The `this` context

**removeBackground()**  
Removes the bKGD chunk from the image.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;The `this` context

**applyZlibLib(**`lib`**)**  
Applies the zlib library to be used for decompression/compression.  Before you can read or output an image buffer, you must set the zlib library.  That can be done via the constructor or via this method call.

&nbsp;&nbsp;&nbsp;&nbsp;_Arguments_  
&nbsp;&nbsp;&nbsp;&nbsp;`lib`: A library that handles the deccompression/compression of image data. The library must implement `inflate()` and `deflate()` methods, each of whose sole argument is the buffer data and whose output is modified (decompressed or compressed) buffer data.  
&nbsp;&nbsp;&nbsp;&nbsp;Examples and the demo app use the [`pako`](https://www.npmjs.com/package/pako) library.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;The `this` context

**isIndexed()**  
Returns a flag indicating whether or not the image is the indexed color type.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;A boolean  

**isGrayscale()**  
Returns a flag indicating whether or not the image is one of the gray scale color types.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;A boolean  

**isTruecolor**()  
Returns a flag indicating whether or not the image is one of the truecolor color types.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;A boolean  

**isGrayscaleWithAlpha()**  
Returns a flag indicating whether or not the image is the grayscale with opacity information color type.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;A boolean  

**isTruecolorWithAlpha()**  
Returns a flag indicating whether or not the image is the truecolor with opacity information color type.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;A boolean  

**hasAlphaChannel()**  
Returns a flag indicating whether or not the image has alpha (opacity) information associated with it.

&nbsp;&nbsp;&nbsp;&nbsp;_Returns_  
&nbsp;&nbsp;&nbsp;&nbsp;A boolean  


### <a name="restrictions">Restrictions</a>
* Image dimensions: the most limiting restriction for expected common use of this module is its (in)ability to handle large images.  Image dimensions of 300x300 and lower should be okay.  Dimensions larger than that may affect performance.
* The supported chunks are: IHDR, IDAT, PLTE, tRNS, bKGD, IEND.  That means other ancillary chunks are not supported.  In most cases those chunk types are irrelevant for the purpose of this library.  For information on chunk types, please see the listed reference material below.
* Only handles images with a single IDAT chunk
* Does not support reading or creation of interlaced images
* Does not support bit depths of 16 or above
* Does not support a PLTE chunk for images that are not of color type 3 (indexed)


### <a name="reference">Reference</a>
* [https://en.wikipedia.org/wiki/Portable_Network_Graphics](https://en.wikipedia.org/wiki/Portable_Network_Graphics)
* [https://www.w3.org/TR/PNG/](https://www.w3.org/TR/PNG/)
* [http://www.libpng.org/pub/png/](http://www.libpng.org/pub/png/)
* [http://www.schaik.com/pngsuite/](http://www.schaik.com/pngsuite/)


### <a name="changelog">Changelog</a>
0.1.0
Initial release.  Welcome to the world react-native-png!
