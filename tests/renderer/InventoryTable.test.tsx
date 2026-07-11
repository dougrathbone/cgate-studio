/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InventoryTable } from '../../src/renderer/components/InventoryTable';
import type { Tree } from '../../src/shared/types';

const tree: Tree = [
  {
    kind: 'network',
    address: '254',
    label: null,
    applications: [],
    units: [
      {
        kind: 'unit',
        address: '61',
        name: 'DIM2',
        type: 'DIMDN8',
        category: 'Dimmer',
        firmware: '2.7.00',
        serial: '100821.2268',
        applications: ['56'],
        groups: ['121'],
      },
    ],
  },
];

describe('InventoryTable', () => {
  it('renders unit rows and selects on click', () => {
    const onSelect = jest.fn();
    render(<InventoryTable tree={tree} onSelect={onSelect} />);
    expect(screen.getByText('DIM2')).toBeInTheDocument();
    expect(screen.getByText('61')).toBeInTheDocument();
    fireEvent.click(screen.getByText('DIM2'));
    expect(onSelect).toHaveBeenCalledWith({
      kind: 'unit',
      network: '254',
      unit: tree[0].units[0],
    });
  });

  it('filters units by query', () => {
    render(<InventoryTable tree={tree} />);
    fireEvent.change(screen.getByLabelText('Filter units'), { target: { value: 'relay' } });
    expect(screen.getByText('No units to show.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter units'), { target: { value: 'dim' } });
    expect(screen.getByText('DIM2')).toBeInTheDocument();
  });
});
