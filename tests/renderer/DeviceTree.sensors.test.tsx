/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { DeviceTree } from '../../src/renderer/components/DeviceTree';
import type { Tree, MeasurementState } from '../../src/shared/types';

const tree: Tree = [{ kind: 'network', address: '254', label: null, applications: [], units: [] }];
const measurements: Record<string, MeasurementState> = {
  '254/228/1': { address: '254/228/1', network: '254', application: '228', channel: '1', value: 25.5, units: '2' },
};

describe('DeviceTree Sensors section', () => {
  it('renders observed measurement values read-only', () => {
    render(<DeviceTree tree={tree} states={{}} measurements={measurements} />);
    expect(screen.getByText('Sensors')).toBeInTheDocument();
    expect(screen.getByText(/254\/228\/1/)).toBeInTheDocument();
    expect(screen.getByText(/25\.5/)).toBeInTheDocument();
  });

  it('omits the Sensors section when there are no measurements for the network', () => {
    render(<DeviceTree tree={tree} states={{}} measurements={{}} />);
    expect(screen.queryByText('Sensors')).toBeNull();
  });
});
