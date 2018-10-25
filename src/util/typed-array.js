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
    value += buffer[newOffset++] << 8
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
