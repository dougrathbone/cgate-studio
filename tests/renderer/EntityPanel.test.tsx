/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { EntityPanel } from '../../src/renderer/components/EntityPanel';
import type { GroupNode, UnitNode } from '../../src/shared/types';

const group: GroupNode = {
  kind: 'group',
  address: '254/56/4',
  network: '254',
  application: '56',
  group: '4',
  label: 'Kitchen',
};

const unit: UnitNode = {
  kind: 'unit',
  address: '61',
  name: 'DIM2',
  type: 'DIMDN8',
  category: 'Dimmer',
  firmware: '2.7.00',
  serial: '100821.2268',
  applications: ['56'],
  groups: ['121', '122', '123'],
};

function installApi() {
  const api = {
    nodes: {
      getGroupParams: jest.fn().mockResolvedValue({
        Name: 'Kitchen',
        RampTime: '4',
        Type: 'light',
      }),
      getUnitParams: jest.fn().mockResolvedValue({
        Name: 'DIM2',
        CatalogNumber: 'L5508D1A',
        Serial: '100821.2268',
        MainsPresent: 'yes',
        NetVoltage: '29.0',
        Groups: '121,122,123,124',
        FARQChannelSpecificRatingFlag: 'no',
        ClassName: 'com.clipsal.cgate.cbus.dev.CBusDIMDN8',
      }),
      setGroupParam: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      setUnitName: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
    },
    labels: {
      rename: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      clear: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
    },
  };
  (window as any).cgate = api;
  return api;
}

describe('EntityPanel', () => {
  it('loads and displays group parameters on the Settings tab', async () => {
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
    expect(await screen.findByRole('tab', { name: 'Live' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
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
    const onProjectDirty = jest.fn();
    render(
      <EntityPanel
        selection={{ kind: 'group', group }}
        connected
        onGroupRenamed={jest.fn()}
        onUnitRenamed={jest.fn()}
        onProjectDirty={onProjectDirty}
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
    expect(onProjectDirty).toHaveBeenCalledWith('254/56/4');
  });

  it('shows a mismatch hint when TagName differs from object Name', async () => {
    const api = installApi();
    api.nodes.getGroupParams.mockResolvedValue({
      Name: 'Hall Object',
      RampTime: '4',
      Type: 'light',
    });
    render(
      <EntityPanel
        selection={{ kind: 'group', group: { ...group, label: 'Kitchen Tag' } }}
        connected
        onGroupRenamed={jest.fn()}
        onUnitRenamed={jest.fn()}
        onError={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(await screen.findByText(/TagName .* differs from object Name/i)).toBeInTheDocument();
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

  it('shows unit Summary/Status/Groups/All tabs and summary cards', async () => {
    const api = installApi();
    render(
      <EntityPanel
        selection={{ kind: 'unit', network: '254', unit }}
        connected
        onGroupRenamed={jest.fn()}
        onUnitRenamed={jest.fn()}
        onError={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(await screen.findByText('Unit 61')).toBeInTheDocument();
    expect(api.nodes.getUnitParams).toHaveBeenCalledWith('254', '61');
    expect(await screen.findByRole('tab', { name: 'Summary' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Groups' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(await screen.findByText('L5508D1A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('DIM2')).toBeInTheDocument();
  });

  it('shows long param keys on the All tab with a flexible param grid', async () => {
    installApi();
    render(
      <EntityPanel
        selection={{ kind: 'unit', network: '254', unit }}
        connected
        onGroupRenamed={jest.fn()}
        onUnitRenamed={jest.fn()}
        onError={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    fireEvent.click(await screen.findByRole('tab', { name: 'All' }));
    const longKey = await screen.findByText('FARQChannelSpecificRatingFlag');
    expect(longKey).toHaveClass('entityPanel__paramKey');
    expect(longKey.closest('.entityPanel__param')).toBeTruthy();
  });

  it('lists group chips on the Groups tab', async () => {
    installApi();
    render(
      <EntityPanel
        selection={{ kind: 'unit', network: '254', unit }}
        connected
        onGroupRenamed={jest.fn()}
        onUnitRenamed={jest.fn()}
        onError={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    fireEvent.click(await screen.findByRole('tab', { name: 'Groups' }));
    expect(await screen.findByText('Group addresses')).toBeInTheDocument();
    expect(screen.getByText('121')).toBeInTheDocument();
    expect(screen.getByText('124')).toBeInTheDocument();
  });
});
