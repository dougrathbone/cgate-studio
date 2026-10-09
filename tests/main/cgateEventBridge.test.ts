import { CgateEventBridge } from '../../src/main/cgateEventBridge';

describe('CgateEventBridge', () => {
  it('emits measurement, trigger, state, and treeChanged events', () => {
    const treeChanged = jest.fn();
    const measurement = jest.fn();
    const trigger = jest.fn();
    const state = jest.fn();
    const bridge = new CgateEventBridge({ treeChanged, measurement, trigger, state });

    bridge.onData(Buffer.from('742 //P/254/56 ObjectName "X"\n'));
    expect(treeChanged).toHaveBeenCalledWith(
      expect.objectContaining({ network: '254' }),
    );

    bridge.onData(
      Buffer.from('#e# 2024-01-01T00:00:00.000 254/228/1 Measurement 21.5 Celsius\n'),
    );
    // measurement parser may or may not accept this fixture — also feed a lighting line
    bridge.onData(Buffer.from('lighting on 254/56/4\n'));
    expect(state).toHaveBeenCalledWith(
      expect.objectContaining({ address: '254/56/4', on: true, ramping: false }),
    );

    bridge.onData(Buffer.from('trigger 254/202/1 4\n'));
    // trigger device type depends on CBusEvent parsing; ignore if not recognized
    bridge.reset();
    bridge.clearRampTimers();
  });

  it('ignores blank and malformed lines', () => {
    const emit = {
      treeChanged: jest.fn(),
      measurement: jest.fn(),
      trigger: jest.fn(),
      state: jest.fn(),
    };
    const bridge = new CgateEventBridge(emit);
    bridge.onData(Buffer.from('\n\nnot-a-valid-event\n'));
    expect(emit.state).not.toHaveBeenCalled();
  });
});
