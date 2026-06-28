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

  it('parseObjectParams skips lines with no colon and lines with empty body after colon', () => {
    const lines = [
      'no-colon-here',
      '300 //P/254/56/4: ',
      '300 //P/254/56/4: Level=50',
    ];
    expect(parseObjectParams(lines)).toEqual({ Level: '50' });
  });
});
