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
    value += buffer[newOffset++] << 8
  } else {
    value += buffer[newOffset++] << 8;
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

const unpackDepth1Data = (packedData) => {
  let unpackedData = new Uint8ClampedArray(packedData.length * 8);
  let i = 0;
  packedData.forEach((byte) => {
    unpackedData[i++] = (byte & 1) === 1 ? 255 : 0;
    unpackedData[i++] = (byte >> 1 & 1) === 1 ? 255 : 0;
    unpackedData[i++] = (byte >> 2 & 1) === 1 ? 255 : 0;
    unpackedData[i++] = (byte >> 3 & 1) === 1 ? 255 : 0;
    unpackedData[i++] = (byte >> 4 & 1) === 1 ? 255 : 0;
    unpackedData[i++] = (byte >> 5 & 1) === 1 ? 255 : 0;
    unpackedData[i++] = (byte >> 7 & 1) === 1 ? 255 : 0;
    unpackedData[i++] = (byte >> 6 & 1) === 1 ? 255 : 0;
  });
  return unpackedData;
};

const unpackDepth2Data = (packedData) => {
  const values = [0, 85, 170, 255];
  let unpackedData = new Uint8ClampedArray(packedData.length * 4);
  let i = 0;
  packedData.forEach((byte) => {
    let pixel1 = 0;
    let pixel2 = 0;
    let pixel3 = 0;
    let pixel4 = 0;

    pixel1 += (byte & 1) === 1 ? 1 : 0;
    pixel1 += (byte >> 1 & 1) === 1 ? 2 : 0;
    pixel2 += (byte >> 2 & 1) === 1 ? 1 : 0;
    pixel2 += (byte >> 3 & 1) === 1 ? 2 : 0;
    pixel3 += (byte >> 4 & 1) === 1 ? 1 : 0;
    pixel3 += (byte >> 5 & 1) === 1 ? 2 : 0;
    pixel4 += (byte >> 6 & 1) === 1 ? 1 : 0;
    pixel4 += (byte >> 7 & 1) === 1 ? 2 : 0;

    unpackedData[i++] = values[pixel1];
    unpackedData[i++] = values[pixel2];
    unpackedData[i++] = values[pixel3];
    unpackedData[i++] = values[pixel4];
  });
  return unpackedData;
};

const unpackDepth4Data = (packedData) => {
  const values = [0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255];
  let unpackedData = new Uint8ClampedArray(packedData.length * 2);
  let i = 0;
  packedData.forEach((byte) => {
    let pixel1 = 0;
    let pixel2 = 0;

    pixel1 += (byte & 1) === 1 ? 1 : 0;
    pixel1 += (byte >> 1 & 1) === 1 ? 2 : 0;
    pixel1 += (byte >> 2 & 1) === 1 ? 4 : 0;
    pixel1 += (byte >> 3 & 1) === 1 ? 8 : 0;
    pixel2 += (byte >> 4 & 1) === 1 ? 1 : 0;
    pixel2 += (byte >> 5 & 1) === 1 ? 2 : 0;
    pixel2 += (byte >> 6 & 1) === 1 ? 4 : 0;
    pixel2 += (byte >> 7 & 1) === 1 ? 8 : 0;

    console.log('bytes -->', pixel1, pixel2);

    unpackedData[i++] = values[pixel1];
    unpackedData[i++] = values[pixel2];
  });
  return unpackedData;
};

const packDepth1Data= (unpackedData) => {
  let packedData = new Uint8ClampedArray(unpackedData.length / 8);
  let i = 0;
  let n = 0;
  while (i < unpackedData.length) {
    let byte = unpackedData[i++] === 255 ? 1 : 0;
    byte += (unpackedData[i++] === 255 ? 1 : 0) << 1;
    byte += (unpackedData[i++] === 255 ? 1 : 0) << 2;
    byte += (unpackedData[i++] === 255 ? 1 : 0) << 3;
    byte += (unpackedData[i++] === 255 ? 1 : 0) << 4;
    byte += (unpackedData[i++] === 255 ? 1 : 0) << 5;
    byte += (unpackedData[i++] === 255 ? 1 : 0) << 6;
    byte += (unpackedData[i++] === 255 ? 1 : 0) << 7;
    packedData[n++] = byte;
  }
  return packedData;
};

const packDepth2Data = (unpackedData) => {
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
    let byte = values[unpackedData[i++]];
    byte += values[unpackedData[i++]] << 2;
    byte += values[unpackedData[i++]] << 4;
    byte += values[unpackedData[i++]] << 6;
    packedData[n++] = byte;
  }
  return packedData;
};

const packDepth4Data = (unpackedData) => {
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
    let byte = values[unpackedData[i++]];
    byte += values[unpackedData[i++]] << 4;
    packedData[n++] = byte;
  }
  return packedData;
};

export const unpackByteData = (packedData, depth) => {
  if (BitDepths.ONE === depth) {
    return unpackDepth1Data(packedData);
  }
  if (BitDepths.TWO === depth) {
    return unpackDepth2Data(packedData);
  }
  if (BitDepths.FOUR === depth) {
    return unpackDepth4Data(packedData);
  }
  return packedData;
};

export const packByteData = (unpackedData, depth) => {
  if (BitDepths.ONE === depth) {
    return packDepth1Data(unpackedData);
  }
  if (BitDepths.TWO === depth) {
    return packDepth2Data(unpackedData);
  }
  if (BitDepths.FOUR === depth) {
    return packDepth4Data(unpackedData);
  }
  return unpackedData;
};
