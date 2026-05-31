/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceTree } from '../../src/renderer/components/DeviceTree';
import type { Tree } from '../../src/shared/types';

const tree: Tree = [
  {
    kind: 'network',
    address: '254',
    label: null,
    applications: [
      {
        kind: 'application',
        address: '56',
        label: 'Lighting',
        groups: [
          { kind: 'group', address: '254/56/4', network: '254', application: '56', group: '4', label: 'Kitchen' },
          { kind: 'group', address: '254/56/5', network: '254', application: '56', group: '5', label: null },
        ],
      },
    ],
    units: [
      {
        kind: 'unit',
        address: '2',
        name: 'RELAY3',
        type: 'RELDN12',
        category: 'Relay',
        firmware: '2.7.00',
        serial: '100906.2211',
        applications: ['56', '255'],
        groups: ['103', '104'],
      },
      {
        kind: 'unit',
        address: '8',
        name: 'SAVANT',
        type: 'PC_CNIED',
        category: 'Interface',
        firmware: '5.4.00',
        serial: '100838.3508',
        applications: ['255'],
        groups: [],
      },
    ],
  },
];

describe('DeviceTree', () => {
  it('shows a placeholder when there is no tree', () => {
    render(<DeviceTree tree={[]} states={{}} />);
    expect(screen.getByText('Not connected.')).toBeInTheDocument();
  });

  it('renders the network with units and applications, including live state', () => {
    const states = { '254/56/4': { address: '254/56/4', level: 255, on: true } };
    render(<DeviceTree tree={tree} states={states} />);

    expect(screen.getByText(/Network 254/)).toBeInTheDocument();
    // Applications + groups (expanded by default), with live state badge.
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('254/56/5')).toBeInTheDocument();
    expect(screen.getByText('ON 100%')).toBeInTheDocument();
    // Physical units listed with friendly category.
    expect(screen.getByText('RELAY3')).toBeInTheDocument();
    expect(screen.getByText('SAVANT')).toBeInTheDocument();
    expect(screen.getByText('Relay')).toBeInTheDocument();
  });

  it('expands a unit to reveal device detail', () => {
    render(<DeviceTree tree={tree} states={{}} />);
    expect(screen.queryByText('100906.2211')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('RELAY3'));
    expect(screen.getByText('100906.2211')).toBeInTheDocument(); // serial now visible
    expect(screen.getByText('103, 104')).toBeInTheDocument();    // groups detail
  });

  it('collapses the network to hide its contents', () => {
    render(<DeviceTree tree={tree} states={{}} />);
    expect(screen.getByText('RELAY3')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Network 254/));
    expect(screen.queryByText('RELAY3')).not.toBeInTheDocument();
    expect(screen.queryByText('Kitchen')).not.toBeInTheDocument();
  });

  it('filters devices and groups by query', () => {
    render(<DeviceTree tree={tree} states={{}} />);
    fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'savant' } });
    expect(screen.getByText('SAVANT')).toBeInTheDocument();
    expect(screen.queryByText('RELAY3')).not.toBeInTheDocument();
    expect(screen.queryByText('Kitchen')).not.toBeInTheDocument();
  });

  it('matches groups by label when filtering', () => {
    render(<DeviceTree tree={tree} states={{}} />);
    fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'kitchen' } });
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.queryByText('254/56/5')).not.toBeInTheDocument();
  });
});
