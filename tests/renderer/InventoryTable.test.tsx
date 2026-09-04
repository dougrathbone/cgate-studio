/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
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
      {
        kind: 'unit',
        address: '62',
        name: 'KEY1',
        type: 'KEYGL5',
        category: 'Switch',
        firmware: null,
        serial: null,
        applications: ['56'],
        groups: [],
      },
    ],
  },
];

const getUnitParams = jest.fn();

beforeEach(() => {
  getUnitParams.mockReset();
  (window as any).cgate = {
    nodes: { getUnitParams },
  };
});

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
    expect(screen.getByText('No matches.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter units'), { target: { value: 'dim' } });
    expect(screen.getByText('DIM2')).toBeInTheDocument();
  });

  it('moves selection with ArrowDown/ArrowUp from the filter', () => {
    const onSelect = jest.fn();
    function Harness() {
      const [selection, setSelection] = React.useState<import('../../src/shared/types').TreeSelection | null>(null);
      return (
        <InventoryTable
          tree={tree}
          selection={selection}
          onSelect={(sel) => {
            onSelect(sel);
            setSelection(sel);
          }}
        />
      );
    }
    render(<Harness />);
    const filter = screen.getByLabelText('Filter units');
    filter.focus();
    fireEvent.keyDown(filter, { key: 'ArrowDown' });
    expect(onSelect).toHaveBeenLastCalledWith({
      kind: 'unit',
      network: '254',
      unit: tree[0].units[0],
    });
    fireEvent.keyDown(filter, { key: 'ArrowDown' });
    expect(onSelect).toHaveBeenLastCalledWith({
      kind: 'unit',
      network: '254',
      unit: tree[0].units[1],
    });
    fireEvent.keyDown(filter, { key: 'ArrowUp' });
    expect(onSelect).toHaveBeenLastCalledWith({
      kind: 'unit',
      network: '254',
      unit: tree[0].units[0],
    });
  });

  it('refresh params overlays serial/firmware without requiring a dirty banner', async () => {
    getUnitParams
      .mockResolvedValueOnce({ Serial: 'S-NEW', Firmware: '9.9.00' })
      .mockResolvedValueOnce({ SerialNo: 'K-NEW', Version: '1.0.00' });
    render(<InventoryTable tree={tree} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Refresh params' }));
    });
    await waitFor(() => {
      expect(screen.getByText('S-NEW')).toBeInTheDocument();
      expect(screen.getByText('9.9.00')).toBeInTheDocument();
      expect(screen.getByText('K-NEW')).toBeInTheDocument();
    });
    expect(getUnitParams).toHaveBeenCalledTimes(2);
  });
});
