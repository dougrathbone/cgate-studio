/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { EntityPanel } from '../../src/renderer/components/EntityPanel';
import type { GroupNode } from '../../src/shared/types';

const group: GroupNode = {
  kind: 'group',
  address: '254/56/4',
  network: '254',
  application: '56',
  group: '4',
  label: 'Kitchen',
};

function installApi() {
  const api = {
    nodes: {
      getGroupParams: jest.fn().mockResolvedValue({
        Name: 'Kitchen',
        RampTime: '4',
        Type: 'light',
      }),
      getUnitParams: jest.fn().mockResolvedValue({ Name: 'DIMMER' }),
      setGroupParam: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      setUnitName: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
    },
    labels: {
      rename: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
    },
  };
  (window as any).cgate = api;
  return api;
}

describe('EntityPanel', () => {
  it('loads and displays group parameters', async () => {
    const api = installApi();
    render(
      <EntityPanel
        selection={{ kind: 'group', group }}
        connected
        onGroupRenamed={jest.fn()}
        onUnitRenamed={jest.fn()}
        onError={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(await screen.findByText('Group 254/56/4')).toBeInTheDocument();
    expect(api.nodes.getGroupParams).toHaveBeenCalledWith({
      network: '254',
      application: '56',
      group: '4',
    });
    expect(await screen.findByDisplayValue('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('light')).toBeInTheDocument();
  });

  it('commits a group Name change via labels.rename', async () => {
    const api = installApi();
    const onGroupRenamed = jest.fn();
    render(
      <EntityPanel
        selection={{ kind: 'group', group }}
        connected
        onGroupRenamed={onGroupRenamed}
        onUnitRenamed={jest.fn()}
        onError={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    const nameInput = await screen.findByDisplayValue('Kitchen');
    fireEvent.change(nameInput, { target: { value: 'Pantry' } });
    fireEvent.blur(nameInput);
    await waitFor(() => {
      expect(api.labels.rename).toHaveBeenCalledWith(
        { network: '254', application: '56', group: '4' },
        'Pantry',
      );
    });
    expect(onGroupRenamed).toHaveBeenCalledWith(group, 'Pantry');
  });

  it('commits a non-Name group parameter via setGroupParam', async () => {
    const api = installApi();
    render(
      <EntityPanel
        selection={{ kind: 'group', group }}
        connected
        onGroupRenamed={jest.fn()}
        onUnitRenamed={jest.fn()}
        onError={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    await screen.findByDisplayValue('Kitchen');
    const rampInput = screen.getByDisplayValue('4');
    fireEvent.change(rampInput, { target: { value: '6' } });
    fireEvent.blur(rampInput);
    await waitFor(() => {
      expect(api.nodes.setGroupParam).toHaveBeenCalledWith(
        { network: '254', application: '56', group: '4' },
        'RampTime',
        '6',
      );
    });
  });

  it('calls onClose when the close button is clicked', async () => {
    installApi();
    const onClose = jest.fn();
    render(
      <EntityPanel
        selection={{ kind: 'group', group }}
        connected={false}
        onGroupRenamed={jest.fn()}
        onUnitRenamed={jest.fn()}
        onError={jest.fn()}
        onClose={onClose}
      />,
    );
    await act(async () => {});
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
