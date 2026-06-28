/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupRow } from '../../src/renderer/components/GroupRow';
import type { GroupNode } from '../../src/shared/types';

const group: GroupNode = {
  kind: 'group',
  address: '254/56/4',
  network: '254',
  application: '56',
  group: '4',
  label: 'Kitchen',
};

const triggerGroup: GroupNode = {
  kind: 'group', address: '254/202/1', network: '254', application: '202', group: '1', label: 'Movie Scene',
};

function makeActions() {
  return { setLevel: jest.fn(), terminateRamp: jest.fn(), rename: jest.fn(), fireScene: jest.fn() };
}

describe('GroupRow', () => {
  it('renders read-only (no controls) when no actions are given', () => {
    render(<GroupRow group={group} state={{ address: group.address, level: 255, on: true }} />);
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('ON 100%')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Turn (on|off)/)).not.toBeInTheDocument();
  });

  it('switches on when off, and off when on', () => {
    const offActions = makeActions();
    const { rerender } = render(<GroupRow group={group} actions={offActions} />);
    fireEvent.click(screen.getByLabelText('Turn on 254/56/4'));
    expect(offActions.setLevel).toHaveBeenCalledWith(group, 255);

    const onActions = makeActions();
    rerender(<GroupRow group={group} state={{ address: group.address, level: 255, on: true }} actions={onActions} />);
    fireEvent.click(screen.getByLabelText('Turn off 254/56/4'));
    expect(onActions.setLevel).toHaveBeenCalledWith(group, 0);
  });

  it('ramps to the slider level (scaled 0-100 -> 0-255)', () => {
    const actions = makeActions();
    render(<GroupRow group={group} actions={actions} />);
    fireEvent.change(screen.getByLabelText('Level 254/56/4'), { target: { value: '50' } });
    expect(actions.setLevel).toHaveBeenCalledWith(group, 128); // round(0.5*255)
  });

  it('shows Stop only while ramping, and terminates the ramp when clicked', () => {
    const actions = makeActions();
    const { rerender } = render(<GroupRow group={group} actions={actions} />);
    // Not ramping: the Stop control is hidden (it only competes with On/Off when relevant).
    expect(screen.queryByLabelText('Stop ramp 254/56/4')).not.toBeInTheDocument();

    rerender(
      <GroupRow group={group} state={{ address: group.address, level: 128, on: true, ramping: true }} actions={actions} />,
    );
    fireEvent.click(screen.getByLabelText('Stop ramp 254/56/4'));
    expect(actions.terminateRamp).toHaveBeenCalledWith(group);
  });

  it('renames on Enter and ignores an unchanged value', () => {
    const actions = makeActions();
    render(<GroupRow group={group} actions={actions} />);
    fireEvent.click(screen.getByLabelText('Edit label 254/56/4'));
    const input = screen.getByLabelText('Rename 254/56/4');
    fireEvent.change(input, { target: { value: 'Lounge' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(actions.rename).toHaveBeenCalledWith(group, 'Lounge');

    // Re-open and submit the same label -> no rename call.
    actions.rename.mockClear();
    fireEvent.click(screen.getByLabelText('Edit label 254/56/4'));
    fireEvent.keyDown(screen.getByLabelText('Rename 254/56/4'), { key: 'Enter' });
    expect(actions.rename).not.toHaveBeenCalled();
  });

  it('cancels rename on Escape without calling the action', () => {
    const actions = makeActions();
    render(<GroupRow group={group} actions={actions} />);
    fireEvent.click(screen.getByLabelText('Edit label 254/56/4'));
    const input = screen.getByLabelText('Rename 254/56/4');
    fireEvent.change(input, { target: { value: 'Nope' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(actions.rename).not.toHaveBeenCalled();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
  });
});

describe('GroupRow trigger group', () => {
  it('renders a Fire button (not On/Off) for an application 202 group', () => {
    render(<GroupRow group={triggerGroup} actions={makeActions()} />);
    expect(screen.getByRole('button', { name: /fire/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /turn on|turn off/i })).toBeNull();
  });

  it('fires the scene with the selected action selector', () => {
    const a = makeActions();
    render(<GroupRow group={triggerGroup} actions={a} />);
    fireEvent.change(screen.getByLabelText(/action selector/i), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /fire/i }));
    expect(a.fireScene).toHaveBeenCalledWith(triggerGroup, 5);
  });
});
