export function str2bv(str) {
  let bufView = new Uint8Array(str.length);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}

export function bv2str(bv) {
  return String.fromCharCode.apply(null, bv);
}
