import { formatCgateSetValue, parseObjectParams } from '../../src/main/cgateParamParse';

describe('cgateParamParse', () => {
  it('formatCgateSetValue quotes values with spaces', () => {
    expect(formatCgateSetValue('Kitchen Lights')).toBe('"Kitchen Lights"');
    expect(formatCgateSetValue('')).toBe('""');
    expect(formatCgateSetValue('simple')).toBe('simple');
  });

  it('parseObjectParams reads key=value pairs from GET * lines', () => {
    const lines = [
      '300 //P/254/56/4: Name="Main bed" Level=128 RampTime=4 Protected=no',
    ];
    expect(parseObjectParams(lines)).toEqual({
      Name: 'Main bed',
      Level: '128',
      RampTime: '4',
      Protected: 'no',
    });
  });
});
