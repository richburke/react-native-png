import { BitDepths } from './constants';

export const indexOfSequence = (bv, seq, start = 0, end = -1) => {
  let searchIndices;
  let limit = end !== -1
    ? end
    : bv.byteLength;
  const seqLength = seq.length;

  for (let i = start; i < limit; i++) {
    searchIndex = bv.indexOf(seq[0], i);
    if (searchIndex === -1) {
      continue;
    }

    searchIndices = [searchIndex];
    for (let j = 1; j < seqLength; j++) {
      if (bv[searchIndex + j] !== seq[j]) {
        break;
      }
      searchIndices.push(searchIndex + j);
    }

    if (searchIndices.length === seqLength) {
      return searchIndices[0];
    }
  }

  return -1;
};

export const writeUint8At = (buffer, offset, value) => {
  buffer[offset++] = value & 255;
  return offset;
}

export const readUint8At = (buffer, offset) => {
  let newOffset = offset;
  const value = buffer[newOffset++] & 255;
  return value;
}

export const writeUint16At = (buffer, offset, value, lsb = false) => {
  if (lsb) {
    buffer[offset++] = value & 255;
    buffer[offset++] = (value >> 8) & 255;
  } else {
    buffer[offset++] = (value >> 8) & 255;
    buffer[offset++] = value & 255;
  }
  return offset;
}

export const readUint16At = (buffer, offset, lsb = false) => {
  let value;
  let newOffset = offset;

  if (lsb) {
    value = buffer[newOffset++] & 255;
    value += buffer[newOffset++] << 8;
  } else {
    value = buffer[newOffset++] << 8;
    value += buffer[newOffset++] & 255;
  }

  return value;
}

export const writeUint32At = (buffer, offset, value, lsb = false) => {
  if (lsb) {
    buffer[offset++] = value & 255;
    buffer[offset++] = (value >> 8) & 255;
    buffer[offset++] = (value >> 16) & 255;
    buffer[offset++] = (value >> 24) & 255;
  } else {
    buffer[offset++] = (value >> 24) & 255;
    buffer[offset++] = (value >> 16) & 255;
    buffer[offset++] = (value >> 8) & 255;
    buffer[offset++] = value & 255;
  }

  return offset;
}

export const readUint32At = (buffer, offset, lsb = false) => {
  let value;
  let newOffset = offset;

  if (lsb) {
    value = buffer[newOffset++] & 255;
    value += buffer[newOffset++] << 8;
    value += buffer[newOffset++] << 16;
    value += buffer[newOffset++] << 24;
  } else {
    value = buffer[newOffset++] << 24;
    value += buffer[newOffset++] << 16;
    value += buffer[newOffset++] << 8;
    value += buffer[newOffset++] & 255;
  }

  return value;
}

const unpackDepth1Data = (packedData, translateValues) => {
  const values = [0, 255];
  let unpackedData = new Uint8ClampedArray(packedData.length * 8);
  let n = 0;

  packedData.forEach((byte) => {
    let pixel1 = byte >> 7 & 1;
    let pixel2 = byte >> 6 & 1;
    let pixel3 = byte >> 5 & 1;
    let pixel4 = byte >> 4 & 1;
    let pixel5 = byte >> 3 & 1;
    let pixel6 = byte >> 2 & 1;
    let pixel7 = byte >> 1 & 1;
    let pixel8 = byte & 1;

    if (translateValues) {
      unpackedData[n++] = values[pixel1];
      unpackedData[n++] = values[pixel2];
      unpackedData[n++] = values[pixel3];
      unpackedData[n++] = values[pixel4];
      unpackedData[n++] = values[pixel5];
      unpackedData[n++] = values[pixel6];
      unpackedData[n++] = values[pixel7];
      unpackedData[n++] = values[pixel8];
    } else {
      unpackedData[n++] = pixel1;
      unpackedData[n++] = pixel2;
      unpackedData[n++] = pixel3;
      unpackedData[n++] = pixel4;
      unpackedData[n++] = pixel5;
      unpackedData[n++] = pixel6;
      unpackedData[n++] = pixel7;
      unpackedData[n++] = pixel8;
    }
  });

  return unpackedData;
};

const unpackDepth2Data = (packedData, translateValues) => {
  const values = [0, 85, 170, 255];
  let unpackedData = new Uint8ClampedArray(packedData.length * 4);
  let n = 0;

  packedData.forEach((byte) => {
    let pixel1 = 0;
    let pixel2 = 0;
    let pixel3 = 0;
    let pixel4 = 0;

    //     pixel1 += (byte & 1) === 1 ? 1 : 0;
    // pixel1 += (byte >> 1 & 1) === 1 ? 2 : 0;
    // pixel2 += (byte >> 2 & 1) === 1 ? 1 : 0;
    // pixel2 += (byte >> 3 & 1) === 1 ? 2 : 0;
    // pixel3 += (byte >> 4 & 1) === 1 ? 1 : 0;
    // pixel3 += (byte >> 5 & 1) === 1 ? 2 : 0;
    // pixel4 += (byte >> 6 & 1) === 1 ? 1 : 0;
    // pixel4 += (byte >> 7 & 1) === 1 ? 2 : 0;

    pixel1 += (byte >> 6 & 1) === 1 ? 1 : 0;
    pixel1 += (byte >> 7 & 1) === 1 ? 2 : 0;
    pixel2 += (byte >> 4 & 1) === 1 ? 1 : 0;
    pixel2 += (byte >> 5 & 1) === 1 ? 2 : 0;
    pixel3 += (byte >> 2 & 1) === 1 ? 1 : 0;
    pixel3 += (byte >> 3 & 1) === 1 ? 2 : 0;
    pixel4 += (byte & 1) === 1 ? 1 : 0;
    pixel4 += (byte >> 1 & 1) === 1 ? 2 : 0;

    if (translateValues) {
      unpackedData[n++] = values[pixel1];
      unpackedData[n++] = values[pixel2];
      unpackedData[n++] = values[pixel3];
      unpackedData[n++] = values[pixel4];
    } else {
      unpackedData[n++] = pixel1;
      unpackedData[n++] = pixel2;
      unpackedData[n++] = pixel3;
      unpackedData[n++] = pixel4;
    }
  });
  return unpackedData;
};

const unpackDepth4Data = (packedData, translateValues) => {
  const values = [0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255];
  let unpackedData = new Uint8ClampedArray(packedData.length * 2);
  let n = 0;

  packedData.forEach((byte) => {
    let pixel1 = 0;
    let pixel2 = 0;

    pixel1 += (byte >> 4 & 1) === 1 ? 1 : 0;
    pixel1 += (byte >> 5 & 1) === 1 ? 2 : 0;
    pixel1 += (byte >> 6 & 1) === 1 ? 4 : 0;
    pixel1 += (byte >> 7 & 1) === 1 ? 8 : 0;
    pixel2 += (byte & 1) === 1 ? 1 : 0;
    pixel2 += (byte >> 1 & 1) === 1 ? 2 : 0;
    pixel2 += (byte >> 2 & 1) === 1 ? 4 : 0;
    pixel2 += (byte >> 3 & 1) === 1 ? 8 : 0;
    // pixel1 += (byte & 1) === 1 ? 1 : 0;
    // pixel1 += (byte >> 1 & 1) === 1 ? 2 : 0;
    // pixel1 += (byte >> 2 & 1) === 1 ? 4 : 0;
    // pixel1 += (byte >> 3 & 1) === 1 ? 8 : 0;
    // pixel2 += (byte >> 4 & 1) === 1 ? 1 : 0;
    // pixel2 += (byte >> 5 & 1) === 1 ? 2 : 0;
    // pixel2 += (byte >> 6 & 1) === 1 ? 4 : 0;
    // pixel2 += (byte >> 7 & 1) === 1 ? 8 : 0;

    if (translateValues) {
      unpackedData[n++] = values[pixel1];
      unpackedData[n++] = values[pixel2];
    } else {
      unpackedData[n++] = pixel1;
      unpackedData[n++] = pixel2;
    }
  });
  return unpackedData;
};

const packDepth1Data= (unpackedData) => {
  let packedData = new Uint8ClampedArray(unpackedData.length / 8);
  let i = 0;
  let n = 0;

  while (i < unpackedData.length) {
    let byte = (unpackedData[i++] > 0 ? 1 : 0) << 7;
    byte |= (unpackedData[i++] > 0 ? 1 : 0) << 6;
    byte |= (unpackedData[i++] > 0 ? 1 : 0) << 5;
    byte |= (unpackedData[i++] > 0 ? 1 : 0) << 4;
    byte |= (unpackedData[i++] > 0 ? 1 : 0) << 3;
    byte |= (unpackedData[i++] > 0 ? 1 : 0) << 2;
    byte |= (unpackedData[i++] > 0 ? 1 : 0) << 1;
    byte |= (unpackedData[i++] > 0 ? 1 : 0);
    packedData[n++] = byte;
  }
  return packedData;
};

const packDepth2Data = (unpackedData, translateValues) => {
  const values = {
    0: 0,
    85: 1,
    170: 2,
    255: 3,
  };
  let packedData = new Uint8ClampedArray(unpackedData.length / 4);
  let i = 0;
  let n = 0;

  while (i < unpackedData.length) {
  let pixel1 = unpackedData[i++];
  let pixel2 = unpackedData[i++];
  let pixel3 = unpackedData[i++];
  let pixel4 = unpackedData[i++];
  let byte;

  //  if (translateValues) {
  //   byte = values[pixel1];
  //   byte += values[pixel2] << 2;
  //   byte += values[pixel3] << 4;
  //   byte += values[pixel4] << 6;
  // } else {
  //   byte = pixel1;
  //   byte += pixel2 << 2;
  //   byte += pixel3 << 4;
  //   byte += pixel4 << 6;
  // }

    if (translateValues) {
      byte = values[pixel1] << 6;
      byte |= values[pixel2] << 4;
      byte |= values[pixel3] << 2;
      byte |= values[pixel4];
    } else {
      byte = pixel1 << 6;
      byte |= pixel2 << 4;
      byte |= pixel3 << 2;
      byte |= pixel4;
    }
    packedData[n++] = byte;
  }
  return packedData;
};

const packDepth4Data = (unpackedData, translateValues) => {
  const values = {
    0: 0, 
    17: 1,
    34: 2,
    51: 3,
    68: 4,
    85: 5,
    102: 6,
    119: 7,
    136: 8,
    153: 9,
    170: 10,
    187: 11,
    204: 12,
    221: 13,
    238: 14,
    255: 15,
  };
  let packedData = new Uint8ClampedArray(unpackedData.length / 2);
  let i = 0;
  let n = 0;

  while (i < unpackedData.length) {
    let pixel1 = unpackedData[i++];
    let pixel2 = unpackedData[i++];
    let byte;

    if (translateValues) {
      byte = values[pixel1] << 4;
      byte |= values[pixel2];
    } else {
      byte = pixel1 << 4;
      byte |= pixel2;
    }
    packedData[n++] = byte;
  }
  return packedData;
};

export const unpackByteData = (packedData, depth, translateValues = false) => {
  if (BitDepths.ONE === depth) {
    return unpackDepth1Data(packedData, translateValues);
  }
  if (BitDepths.TWO === depth) {
    return unpackDepth2Data(packedData, translateValues);
  }
  if (BitDepths.FOUR === depth) {
    return unpackDepth4Data(packedData, translateValues);
  }
  return packedData;
};

export const packByteData = (unpackedData, depth, translateValues = false) => {
  if (BitDepths.ONE === depth) {
    return packDepth1Data(unpackedData);
  }
  if (BitDepths.TWO === depth) {
    return packDepth2Data(unpackedData, translateValues);
  }
  if (BitDepths.FOUR === depth) {
    return packDepth4Data(unpackedData, translateValues);
  }
  return unpackedData;
};
