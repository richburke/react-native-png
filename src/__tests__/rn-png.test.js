import RnPng from '../rn-png';

describe('RnPng', () => {
  it('creates an object', () => {
    const rnPng = new RnPng({});
    expect(typeof rnPng === 'object');
  });
});
