/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupsWorkspace } from '../../src/renderer/components/GroupsWorkspace';
import type { GroupNode } from '../../src/shared/types';

const groups: GroupNode[] = [
  {
    kind: 'group',
    address: '254/56/4',
    network: '254',
    application: '56',
    group: '4',
    label: 'Kitchen',
  },
  {
    kind: 'group',
    address: '254/56/5',
    network: '254',
    application: '56',
    group: '5',
    label: 'Dining',
  },
];

describe('GroupsWorkspace', () => {
  it('lists groups and filters by label', () => {
    render(<GroupsWorkspace groups={groups} states={{}} />);
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Dining')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter groups'), { target: { value: 'din' } });
    expect(screen.queryByText('Kitchen')).not.toBeInTheDocument();
    expect(screen.getByText('Dining')).toBeInTheDocument();
  });

  it('bulk Off sends selected groups at level 0', () => {
    const onBulkSetLevel = jest.fn();
    render(
      <GroupsWorkspace groups={groups} states={{}} onBulkSetLevel={onBulkSetLevel} />,
    );
    fireEvent.click(screen.getByLabelText('Select 254/56/4'));
    fireEvent.click(screen.getByLabelText('Select 254/56/5'));
    fireEvent.click(screen.getByRole('button', { name: 'Off' }));
    expect(onBulkSetLevel).toHaveBeenCalledWith(
      [groups[0], groups[1]],
      0,
    );
  });

  it('Clear label confirms then calls onClearLabels with selected groups', () => {
    const onClearLabels = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <GroupsWorkspace groups={groups} states={{}} onClearLabels={onClearLabels} />,
    );
    fireEvent.click(screen.getByLabelText('Select 254/56/4'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear label' }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onClearLabels).toHaveBeenCalledWith([groups[0]]);
    confirmSpy.mockRestore();
  });

  it('select-all, bulk On/50%, and cancel clear-label cover remaining toolbar paths', () => {
    const onBulkSetLevel = jest.fn();
    const onClearLabels = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <GroupsWorkspace
        groups={groups}
        states={{ '254/56/4': { address: '254/56/4', level: 10, on: true, ramping: false } }}
        onBulkSetLevel={onBulkSetLevel}
        onClearLabels={onClearLabels}
        onSelect={jest.fn()}
        selection={{ kind: 'group', group: groups[0] }}
      />,
    );
    fireEvent.click(screen.getByLabelText('Select all visible groups'));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'On' }));
    fireEvent.click(screen.getByRole('button', { name: '50%' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear label' }));
    expect(onBulkSetLevel).toHaveBeenCalledWith(groups, 255);
    expect(onBulkSetLevel).toHaveBeenCalledWith(groups, 128);
    expect(onClearLabels).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Select all visible groups'));
    fireEvent.click(screen.getByText('Kitchen'));
    confirmSpy.mockRestore();
  });

  it('focuses the filter when / is pressed', () => {
    render(<GroupsWorkspace groups={groups} states={{}} />);
    const input = screen.getByLabelText('Filter groups');
    expect(input).not.toHaveFocus();
    fireEvent.keyDown(window, { key: '/' });
    expect(input).toHaveFocus();
  });
});
